import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'kitchen' | 'waiter' | 'cashier' | 'stock')[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user, userRole, loading, isEmployee } = useAuth();
  const location = useLocation();

  // Don't redirect while still loading
  if (loading) {
    return <div>Carregando...</div>;
  }

  // If not authenticated (neither user nor employee), redirect to login
  if (!user && !isEmployee) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role restriction is specified and user doesn't have the required role
  if (allowedRoles && !allowedRoles.includes(userRole as any)) {
    // Redirect to home page if user doesn't have the required role
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;