import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmployeeAuthService from '../services/EmployeeAuthService';
import { Database } from '../types/database';

type Employee = Database['public']['Tables']['employees']['Row'];

interface EmployeeAuthData {
  isEmployee: boolean;
  employeeData: Employee | null;
  restaurantId: string | null;
  permissions: string[];
  loading: boolean;
}

export const useEmployeeAuth = (): EmployeeAuthData => {
  const { user } = useAuth();
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadEmployeeData();
    } else {
      setEmployeeData(null);
      setLoading(false);
    }
  }, [user]);

  const loadEmployeeData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await EmployeeAuthService.getCurrentEmployeeData(user.id);
      setEmployeeData(data);
    } catch (error) {
      console.error('Error loading employee data:', error);
      setEmployeeData(null);
    } finally {
      setLoading(false);
    }
  };

  const getPermissions = (role: string): string[] => {
    const rolePermissions: Record<string, string[]> = {
      waiter: ['mesas', 'comandas', 'cardapio-online'],
      cashier: ['pdv', 'comandas', 'caixa', 'mesas', 'produtos'],
      stock: ['produtos', 'estoque', 'cardapio-online', 'cardapio-online-editor', 'cmv'],
      kitchen: ['comandas'],
      admin: ['all'] // Admin tem acesso a tudo
    };

    return rolePermissions[role] || [];
  };

  return {
    isEmployee: !!employeeData,
    employeeData,
    restaurantId: employeeData?.restaurant_id || null,
    permissions: employeeData ? getPermissions(employeeData.role) : [],
    loading
  };
};

// Hook para verificar permissões específicas
export const usePermissions = () => {
  const { userRole } = useAuth();
  const { permissions, isEmployee } = useEmployeeAuth();

  const hasPermission = (permission: string): boolean => {
    // Se é admin, tem acesso a tudo
    if (userRole === 'admin' && !isEmployee) {
      return true;
    }

    // Se é funcionário, verificar permissões específicas
    if (isEmployee) {
      return permissions.includes(permission) || permissions.includes('all');
    }

    // Se não é funcionário nem admin, verificar role do usuário
    const userPermissions: Record<string, string[]> = {
      admin: ['all'],
      waiter: ['mesas', 'comandas', 'cardapio-online'],
      cashier: ['pdv', 'comandas', 'caixa', 'mesas', 'produtos'],
      stock: ['produtos', 'estoque', 'cardapio-online', 'cardapio-online-editor', 'cmv'],
      kitchen: ['comandas']
    };

    const userPerms = userPermissions[userRole || ''] || [];
    return userPerms.includes(permission) || userPerms.includes('all');
  };

  return { hasPermission };
};