import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, LayoutDashboard, Users, ShoppingBag, 
  ClipboardList, ChefHat, PieChart, Settings, LogOut,
  Bell, Search, Coffee, CreditCard, Moon, Sun
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ProfileDropdown from '../components/profile/ProfileDropdown'; // Importado aqui

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isPDV = location.pathname === '/pdv';

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, roles: ['admin', 'cashier'] },
    { name: 'Mesas', path: '/mesas', icon: <Coffee size={20} />, roles: ['admin', 'waiter'] },
    { name: 'Comandas', path: '/comandas', icon: <ClipboardList size={20} />, roles: ['admin', 'kitchen', 'waiter'] },
    { name: 'PDV', path: '/pdv', icon: <CreditCard size={20} />, roles: ['admin', 'cashier'] },
    { name: 'Produtos', path: '/produtos', icon: <ShoppingBag size={20} />, roles: ['admin', 'stock'] },
    { name: 'Estoque', path: '/estoque', icon: <ChefHat size={20} />, roles: ['admin', 'stock'] },
    { name: 'Pedidos iFood', path: '/ifood', icon: <ShoppingBag size={20} />, roles: ['admin', 'kitchen'] },
    { name: 'Relatórios', path: '/relatorios', icon: <PieChart size={20} />, roles: ['admin', 'cashier'] },
 
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (isPDV) return <Outlet />;

  return (
    <div className={`min-h-screen bg-gray-100 flex ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-700 px-4">
          <img src="/logo.svg" alt="ChefComanda" className="h-10" />
        </div>
        <div className="flex flex-col flex-grow overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  location.pathname === item.path
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              icon={<LogOut size={20} />}
              onClick={signOut}
            >
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Sidebar Mobile */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={toggleSidebar}></div>
        <div className="fixed inset-y-0 left-0 flex flex-col z-40 w-64 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between h-16 border-b border-gray-200 dark:border-gray-700 px-4">
            <img src="/logo.svg" alt="ChefComanda" className="h-8" />
            <button onClick={toggleSidebar} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              <X size={24} />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    location.pathname === item.path
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={toggleSidebar}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                icon={<LogOut size={20} />}
                onClick={signOut}
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={toggleSidebar} className="md:hidden text-gray-500 dark:text-gray-400 mr-2">
                <Menu size={24} />
              </button>
              <div className="relative w-64 hidden md:none">
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-4 text-gray-900 dark:text-gray-100"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <Search size={18} />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button className="relative p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <Bell size={20} />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              <ProfileDropdown />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
