import { supabase } from './supabase';
import { Database } from '../types/database';

type Employee = Database['public']['Tables']['employees']['Row'];

export interface CreateEmployeeData {
  name: string;
  email: string;
  password: string;
  role: 'waiter' | 'cashier' | 'stock' | 'kitchen';
  cpf: string;
}

export interface EmployeeWithAuth extends Employee {
  auth_user_id: string | null;
  has_auth: boolean;
}

class EmployeeAuthService {
  private static instance: EmployeeAuthService;

  private constructor() {}

  static getInstance(): EmployeeAuthService {
    if (!EmployeeAuthService.instance) {
      EmployeeAuthService.instance = new EmployeeAuthService();
    }
    return EmployeeAuthService.instance;
  }

  // Criar funcionário com usuário no auth.users
  async createEmployeeWithAuth(
    companyId: string,
    employeeData: CreateEmployeeData
  ): Promise<EmployeeWithAuth> {
    try {
      // 1. Criar usuário no auth.users usando Admin API
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: employeeData.email,
        password: employeeData.password,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          name: employeeData.name,
          role: employeeData.role,
          is_employee: true
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }

      if (!authUser.user) {
        throw new Error('Usuário não foi criado');
      }

      // 2. Criar registro na tabela employees
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .insert({
          company_id: companyId,
          name: employeeData.name,
          cpf: employeeData.cpf,
          role: employeeData.role,
          auth_user_id: authUser.user.id,
          active: true
        })
        .select()
        .single();

      if (employeeError) {
        // Se falhar ao criar funcionário, remover usuário criado
        try {
          await supabase.auth.admin.deleteUser(authUser.user.id);
        } catch (deleteError) {
          console.error('Error cleaning up auth user:', deleteError);
        }
        throw new Error(`Erro ao criar funcionário: ${employeeError.message}`);
      }

      // 3. Criar perfil do funcionário
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          name: employeeData.name,
          cpf: employeeData.cpf
        });

      if (profileError) {
        console.error('Error creating employee profile:', profileError);
        // Não falhar por causa do perfil, apenas logar o erro
      }

      // 4. Criar role do funcionário
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role: employeeData.role
        });

      if (roleError) {
        console.error('Error creating employee role:', roleError);
        // Não falhar por causa da role, apenas logar o erro
      }

      return {
        ...employee,
        has_auth: true
      };
    } catch (error) {
      console.error('Error in createEmployeeWithAuth:', error);
      throw error;
    }
  }

  // Obter funcionários com dados de autenticação
  async getEmployeesWithAuth(companyId: string): Promise<EmployeeWithAuth[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;

      return (data || []).map(emp => ({
        ...emp,
        has_auth: !!emp.auth_user_id
      }));
    } catch (error) {
      console.error('Error getting employees with auth:', error);
      throw error;
    }
  }

  // Atualizar senha do funcionário
  async updateEmployeePassword(authUserId: string, newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.admin.updateUserById(authUserId, {
        password: newPassword
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating employee password:', error);
      throw error;
    }
  }

  // Desativar funcionário (desabilitar login)
  async deactivateEmployee(employeeId: string): Promise<void> {
    try {
      // 1. Desativar funcionário na tabela
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .update({ active: false })
        .eq('id', employeeId)
        .select('auth_user_id')
        .single();

      if (employeeError) throw employeeError;

      // 2. Desabilitar usuário no auth se existir
      if (employee.auth_user_id) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          employee.auth_user_id,
          { ban_duration: 'none' } // Banir indefinidamente
        );

        if (authError) {
          console.error('Error deactivating auth user:', authError);
          // Não falhar se não conseguir desativar no auth
        }
      }
    } catch (error) {
      console.error('Error deactivating employee:', error);
      throw error;
    }
  }

  // Reativar funcionário
  async reactivateEmployee(employeeId: string): Promise<void> {
    try {
      // 1. Reativar funcionário na tabela
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .update({ active: true })
        .eq('id', employeeId)
        .select('auth_user_id')
        .single();

      if (employeeError) throw employeeError;

      // 2. Reabilitar usuário no auth se existir
      if (employee.auth_user_id) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          employee.auth_user_id,
          { ban_duration: '0' } // Remover ban
        );

        if (authError) {
          console.error('Error reactivating auth user:', authError);
          // Não falhar se não conseguir reativar no auth
        }
      }
    } catch (error) {
      console.error('Error reactivating employee:', error);
      throw error;
    }
  }

  // Excluir funcionário completamente
  async deleteEmployee(employeeId: string): Promise<void> {
    try {
      // 1. Buscar dados do funcionário
      const { data: employee, error: getError } = await supabase
        .from('employees')
        .select('auth_user_id')
        .eq('id', employeeId)
        .single();

      if (getError) throw getError;

      // 2. Excluir usuário do auth se existir
      if (employee.auth_user_id) {
        const { error: authError } = await supabase.auth.admin.deleteUser(
          employee.auth_user_id
        );

        if (authError) {
          console.error('Error deleting auth user:', authError);
          // Continuar mesmo se não conseguir excluir do auth
        }
      }

      // 3. Excluir funcionário da tabela
      const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Verificar se email já está em uso
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        console.error('Error checking email:', error);
        return false;
      }

      return data.users.some(user => user.email === email);
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  // Obter dados do funcionário logado
  async getCurrentEmployeeData(userId: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', userId)
        .eq('active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Não é funcionário
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting current employee data:', error);
      return null;
    }
  }
}

export default EmployeeAuthService.getInstance();