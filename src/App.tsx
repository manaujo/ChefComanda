import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import Planos from './pages/profile/Planos';
import UserProfile from './pages/profile/UserProfile';
import Settings from './pages/profile/Settings';
import Success from './pages/checkout/Success';

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
import Cardapio from './pages/Produtos';
import Estoque from './pages/Estoque';
import Relatorios from './pages/Relatorios';
import IFoodPedidos from './pages/IFoodPedidos';
import CaixaRegistradora from './pages/CaixaRegistradora';
import PDV from './pages/PDV';
import CardapioOnline from './pages/CardapioOnline';
import CardapioOnlineEditor from './pages/CardapioOnlineEditor';
import CardapioPublico from './pages/CardapioPublico';
import CMV from './pages/CMV';
import Suporte from './pages/Suporte';

// Profile Pages
import CompanyProfile from './pages/profile/CompanyProfile';
import EmployeeManagement from './pages/profile/EmployeeManagement';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { RestauranteProvider } from './contexts/RestauranteContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import PrivateRoute from './components/PrivateRoute';
import SubscriptionGuard from './components/SubscriptionGuard';

// Componente para gerenciar navegação sem recarregar
const NavigationManager: React.FC = () => {
  const location = useLocation();
  
  React.useEffect(() => {
    // Salvar rota atual
    sessionStorage.setItem('lastRoute', location.pathname);
  }, [location.pathname]);
  
  return null;
};
function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <RestauranteProvider>
            <NavigationManager />
            <Toaster position="top-right" />
            <Routes>
              {/* Auth Routes */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/" element={<Navigate to="/landing" replace />} />
              <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
              <Route path="/signup" element={<AuthLayout><SignUp /></AuthLayout>} />
              <Route path="/auth/verify-email" element={<AuthLayout><VerifyEmail /></AuthLayout>} />
              
              {/* Checkout Routes */}
              <Route path="/checkout/success" element={<Success />} />
              
              {/* Public Menu Route */}
              <Route path="/cardapio/:restauranteId" element={<CardapioPublico />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <SubscriptionGuard>
                    <DashboardLayout />
                  </SubscriptionGuard>
                </PrivateRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="mesas" element={<PrivateRoute allowedRoles={['admin', 'waiter', 'cashier']}><Mesas /></PrivateRoute>} />
                <Route path="comandas" element={<PrivateRoute requiredPermission="comandas"><Comandas /></PrivateRoute>} />
                <Route path="cardapio" element={<PrivateRoute requiredPermission="produtos"><Cardapio /></PrivateRoute>} />
                <Route path="estoque" element={<PrivateRoute requiredPermission="estoque"><Estoque /></PrivateRoute>} />
                <Route path="relatorios" element={<PrivateRoute allowedRoles={['admin']}><Relatorios /></PrivateRoute>} />
                <Route path="ifood" element={<PrivateRoute requiredPermission="pdv"><IFoodPedidos /></PrivateRoute>} />
                <Route path="caixa" element={<PrivateRoute requiredPermission="caixa"><CaixaRegistradora /></PrivateRoute>} />
                <Route path="pdv" element={<PrivateRoute requiredPermission="pdv"><PDV /></PrivateRoute>} />
                <Route path="cardapio-online" element={<PrivateRoute requiredPermission="cardapio-online"><CardapioOnline /></PrivateRoute>} />
                <Route path="cardapio-online/editor" element={<PrivateRoute requiredPermission="cardapio-online-editor"><CardapioOnlineEditor /></PrivateRoute>} />
                <Route path="cmv" element={<PrivateRoute requiredPermission="cmv"><CMV /></PrivateRoute>} />
                <Route path="suporte" element={<PrivateRoute><Suporte /></PrivateRoute>} />
                
                {/* Profile Routes */}
                <Route path="profile">
                  <Route path="user" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
                <Route index element={<Navigate to="user" replace />} />
                  <Route path="settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                  <Route path="company" element={<PrivateRoute allowedRoles={['admin']}><CompanyProfile /></PrivateRoute>} />
                  <Route path="employees" element={<PrivateRoute allowedRoles={['admin']}><EmployeeManagement /></PrivateRoute>} />
                  <Route path="planos" element={<PrivateRoute allowedRoles={['admin']}><Planos /></PrivateRoute>} />
                </Route>
              </Route>
              
              {/* Redirect any unknown routes to dashboard */}
              <Route path="*" element={<Navigate to="/landing" replace />} />
            </Routes>
          </RestauranteProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;