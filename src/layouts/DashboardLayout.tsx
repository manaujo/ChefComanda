import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  Menu, ChefHat, LayoutDashboard, Users, ShoppingBag,
  ClipboardList, PieChart, Settings, Coffee, QrCode,
  CreditCard, Moon, Sun, Globe, PenSquare, Calculator, Zap,
  HelpCircle, Headphones
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePermissions } from '../hooks/useEmployeeAuth';
import ProfileDropdown from '../components/profile/ProfileDropdown';
import NotificationDropdown from '../components/NotificationDropdown';
import EmployeeDebugPanel from '../components/debug/EmployeeDebugPanel';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { userRole, isEmployee, user, loading } = useAuth();
  const { hasPermission } = usePermissions();
  const isPDV = location.pathname === '/dashboard/pdv';
  const isComandas = location.pathname === '/dashboard/comandas';

  // Prevent unnecessary redirects when user is already authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/landing');
    }
  }, [user, loading, navigate]);

  // Definir quais itens de menu cada função pode acessar
  const getRoleNavItems = () => {
    const allNavItems = [
      { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, permission: 'dashboard' },
      { name: 'Mesas', path: '/dashboard/mesas', icon: <Coffee size={20} />, permission: 'mesas' },
      { name: 'Comandas', path: '/dashboard/comandas', icon: <ClipboardList size={20} />, permission: 'comandas' },
      { name: 'PDV', path: '/dashboard/pdv', icon: <CreditCard size={20} />, permission: 'pdv' },
      { name: 'Caixa', path: '/dashboard/caixa', icon: <CreditCard size={20} />, permission: 'caixa' },
      { name: 'Cardápio', path: '/dashboard/cardapio', icon: <ShoppingBag size={20} />, permission: 'produtos' },
      { name: 'Estoque', path: '/dashboard/estoque', icon: <ShoppingBag size={20} />, permission: 'estoque' },
      { name: 'Pedidos iFood', path: '/dashboard/ifood', icon: <ShoppingBag size={20} />, permission: 'ifood' },
      { name: 'Relatórios', path: '/dashboard/relatorios', icon: <PieChart size={20} />, permission: 'relatorios' },
      { name: 'CMV', path: '/dashboard/cmv', icon: <Calculator size={20} />, permission: 'cmv' },
      { name: 'Cardápio Online', path: '/dashboard/cardapio-online', icon: <QrCode size={20} />, permission: 'cardapio-online' },
      { name: 'Editor de Cardápio', path: '/dashboard/cardapio-online/editor', icon: <PenSquare size={20} />, permission: 'cardapio-online-editor' },
      { name: 'Suporte', path: '/dashboard/suporte', icon: <Headphones size={20} />, permission: 'suporte' },
      { name: 'Pedidos Rápidos', path: '/dashboard/pedidos-rapidos', icon: <Zap size={20} />, permission: 'pdv' }
    ];

    // Filtrar itens com base nas permissões
    return allNavItems.filter(item => {
      // Admin sempre tem acesso (se não for funcionário)
      if (userRole === 'admin' && !isEmployee) {
        return true;
      }
      
      // Verificar permissão específica
      return hasPermission(item.permission);
    });
  };

  const navItems = getRoleNavItems();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  if (isPDV || isComandas) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
          <div className="h-16 px-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Menu size={24} className="text-gray-600 dark:text-gray-300" />
            </button>

            <div className="flex items-center space-x-2">
              <ChefHat size={28} className="text-red-600 dark:text-red-400" />
              <span className="text-xl font-bold text-gray-800 dark:text-gray-200">
                Chef Comanda
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                title="Alternar tema"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {!isEmployee && <NotificationDropdown />}
              <ProfileDropdown />
            </div>
          </div>
        </header>

        {sidebarOpen && (
          <>
            <aside
              className="fixed left-0 top-16 bottom-0 z-40 w-64 bg-white dark:bg-gray-800 shadow-lg"
              onMouseEnter={() => setSidebarHover(true)}
              onMouseLeave={() => setSidebarHover(false)}
            >
              <nav className="h-full py-4 overflow-y-auto">
                <div className="px-4 space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                        location.pathname === item.path
                          ? 'bg-red-50 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </nav>
            </aside>
            <div
              className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40 transition-opacity"
              onClick={() => setSidebarOpen(false)}
            ></div>
          </>
        )}

        <main className="pt-16 min-h-screen">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
        <div className="h-16 px-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Menu size={24} className="text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex items-center space-x-2">
            <ChefHat size={28} className="text-red-600 dark:text-red-400" />
            <span className="text-xl font-bold text-gray-800 dark:text-gray-200">
              Chef Comanda
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              title="Alternar tema"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {!isEmployee && <NotificationDropdown />}
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <aside
        className={`fixed left-0 top-16 bottom-0 z-40 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen || sidebarHover ? 'translate-x-0' : '-translate-x-full'
        }`}
        onMouseEnter={() => setSidebarHover(true)}
        onMouseLeave={() => setSidebarHover(false)}
      >
        <nav className="h-full py-4 overflow-y-auto">
          <div className="px-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  location.pathname === item.path
                    ? 'bg-red-50 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <main className="pt-16 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
          <EmployeeDebugPanel />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;