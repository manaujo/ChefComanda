import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/useEmployeeAuth';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'kitchen' | 'waiter' | 'cashier' | 'stock')[];
  requiredPermission?: string;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles, requiredPermission }) => {
  const { user, userRole, loading, isEmployee } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!user && !isEmployee) {
    return <Navigate to="/landing" state={{ from: location }} replace />;
  }

  // Verificar permissões
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Verificar roles (manter compatibilidade)
  if (allowedRoles && !allowedRoles.includes(userRole as any)) {
    // Se é funcionário, verificar permissões específicas
    if (isEmployee && requiredPermission && hasPermission(requiredPermission)) {
      // Permitir acesso se tem a permissão específica
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default PrivateRoute;