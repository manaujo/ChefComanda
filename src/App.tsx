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
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Mesas from './pages/Mesas';
import Comandas from './pages/Comandas';
import Cardapio from './pages/Produtos';
import Estoque from './pages/Estoque';
import Relatorios from './pages/Relatorios';
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
import SubscriptionGuard from './components/SubscriptionGuard';

// Components
import PrivateRoute from './components/PrivateRoute';

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
              <Route path="/auth/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
              <Route path="/auth/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />
              
              {/* Checkout Routes */}
              <Route path="/checkout/success" element={<Success />} />
              
              {/* Public Menu Route */}
              <Route path="/cardapio/:restauranteId" element={<CardapioPublico />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <SubscriptionGuard allowDashboard={true} requireActiveSubscription={false}>
                    <DashboardLayout />
                  </SubscriptionGuard>
                </PrivateRoute>
              }>
                <Route index element={<SubscriptionGuard allowDashboard={true} requireActiveSubscription={false}><Dashboard /></SubscriptionGuard>} />
                <Route path="mesas" element={<PrivateRoute allowedRoles={['admin', 'waiter', 'cashier']}><SubscriptionGuard requireActiveSubscription={true}><Mesas /></SubscriptionGuard></PrivateRoute>} />
                <Route path="comandas" element={<PrivateRoute requiredPermission="comandas"><SubscriptionGuard requireActiveSubscription={true}><Comandas /></SubscriptionGuard></PrivateRoute>} />
                <Route path="cardapio" element={<PrivateRoute requiredPermission="produtos"><SubscriptionGuard requireActiveSubscription={true}><Cardapio /></SubscriptionGuard></PrivateRoute>} />
                <Route path="estoque" element={<PrivateRoute requiredPermission="estoque"><SubscriptionGuard requireActiveSubscription={true}><Estoque /></SubscriptionGuard></PrivateRoute>} />
                <Route path="relatorios" element={<PrivateRoute allowedRoles={['admin']}><SubscriptionGuard requireActiveSubscription={true}><Relatorios /></SubscriptionGuard></PrivateRoute>} />
                <Route path="caixa" element={<PrivateRoute requiredPermission="caixa"><SubscriptionGuard requireActiveSubscription={true}><CaixaRegistradora /></SubscriptionGuard></PrivateRoute>} />
                <Route path="pdv" element={<PrivateRoute requiredPermission="pdv"><SubscriptionGuard requireActiveSubscription={true}><PDV /></SubscriptionGuard></PrivateRoute>} />
                <Route path="cardapio-online" element={<PrivateRoute requiredPermission="cardapio-online"><SubscriptionGuard requireActiveSubscription={true}><CardapioOnline /></SubscriptionGuard></PrivateRoute>} />
                <Route path="cardapio-online/editor" element={<PrivateRoute requiredPermission="cardapio-online-editor"><SubscriptionGuard requireActiveSubscription={true}><CardapioOnlineEditor /></SubscriptionGuard></PrivateRoute>} />
                <Route path="cmv" element={<PrivateRoute requiredPermission="cmv"><SubscriptionGuard requireActiveSubscription={true}><CMV /></SubscriptionGuard></PrivateRoute>} />
                <Route path="suporte" element={<PrivateRoute><SubscriptionGuard requireActiveSubscription={true}><Suporte /></SubscriptionGuard></PrivateRoute>} />
                
                {/* Profile Routes */}
                <Route path="profile">
                  <Route path="user" element={<PrivateRoute><SubscriptionGuard allowDashboard={true} requireActiveSubscription={false}><UserProfile /></SubscriptionGuard></PrivateRoute>} />
                <Route index element={<Navigate to="user" replace />} />
                  <Route path="settings" element={<PrivateRoute><SubscriptionGuard allowDashboard={true} requireActiveSubscription={false}><Settings /></SubscriptionGuard></PrivateRoute>} />
                  <Route path="company" element={<PrivateRoute allowedRoles={['admin']}><SubscriptionGuard allowDashboard={true} requireActiveSubscription={false}><CompanyProfile /></SubscriptionGuard></PrivateRoute>} />
                  <Route path="employees" element={<PrivateRoute allowedRoles={['admin']}><SubscriptionGuard allowDashboard={true} requireActiveSubscription={false}><EmployeeManagement /></SubscriptionGuard></PrivateRoute>} />
                  <Route path="planos" element={<PrivateRoute allowedRoles={['admin']}><SubscriptionGuard allowDashboard={true} requireActiveSubscription={false}><Planos /></SubscriptionGuard></PrivateRoute>} />
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