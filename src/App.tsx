import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Planos from './pages/profile/Planos';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Login from './pages/Login';
import SignUp from './pages/auth/SignUp';
import VerifyEmail from './pages/auth/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Mesas from './pages/Mesas';
import Comandas from './pages/Comandas';
import Produtos from './pages/Produtos';
import Estoque from './pages/Estoque';
import Relatorios from './pages/Relatorios';
import IFoodPedidos from './pages/IFoodPedidos';
import CaixaRegistradora from './pages/CaixaRegistradora';
import PDV from './pages/PDV';

// Profile Pages
import CompanyProfile from './pages/profile/CompanyProfile';
import EmployeeManagement from './pages/profile/EmployeeManagement';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { RestauranteProvider } from './contexts/RestauranteContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <RestauranteProvider>
            <Toaster position="top-right" />
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
              <Route path="/signup" element={<AuthLayout><SignUp /></AuthLayout>} />
              <Route path="/auth/verify-email" element={<AuthLayout><VerifyEmail /></AuthLayout>} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="mesas" element={<PrivateRoute allowedRoles={['admin', 'waiter', 'cashier']}><Mesas /></PrivateRoute>} />
                <Route path="comandas" element={<PrivateRoute allowedRoles={['admin', 'kitchen', 'waiter', 'cashier']}><Comandas /></PrivateRoute>} />
                <Route path="produtos" element={<PrivateRoute allowedRoles={['admin', 'stock']}><Produtos /></PrivateRoute>} />
                <Route path="estoque" element={<PrivateRoute allowedRoles={['admin', 'stock']}><Estoque /></PrivateRoute>} />
                <Route path="relatorios" element={<PrivateRoute allowedRoles={['admin', 'cashier']}><Relatorios /></PrivateRoute>} />
                <Route path="ifood" element={<PrivateRoute allowedRoles={['admin', 'kitchen', 'cashier']}><IFoodPedidos /></PrivateRoute>} />
                <Route path="caixa" element={<PrivateRoute allowedRoles={['admin', 'cashier']}><CaixaRegistradora /></PrivateRoute>} />
                <Route path="pdv" element={<PrivateRoute allowedRoles={['admin', 'cashier']}><PDV /></PrivateRoute>} />
                
                {/* Profile Routes */}
                <Route path="profile/company" element={<PrivateRoute allowedRoles={['admin']}><CompanyProfile /></PrivateRoute>} />
                <Route path="profile/employees" element={<PrivateRoute allowedRoles={['admin']}><EmployeeManagement /></PrivateRoute>} />
                <Route path="profile/planos" element={<PrivateRoute allowedRoles={['admin']}><Planos /></PrivateRoute>} />
              </Route>
              
              {/* Redirect any unknown routes to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </RestauranteProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;