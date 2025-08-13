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
      // Call Edge Function to create employee with auth
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee-user`;
      
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          companyId,
          name: employeeData.name,
          email: employeeData.email,
          password: employeeData.password,
          role: employeeData.role,
          cpf: employeeData.cpf
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar funcionário');
      }

      return result.employee;
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
        .maybeSingle();

      if (error) {
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