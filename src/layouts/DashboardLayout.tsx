import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Menu, X, LayoutDashboard, Users, ShoppingBag,
  ClipboardList, ChefHat, PieChart, Settings, LogOut,
  Bell, CreditCard, Moon, Sun, Coffee, QrCode
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ProfileDropdown from '../components/profile/ProfileDropdown';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isPDV = location.pathname === '/pdv';
  const isComandas = location.pathname === '/comandas';

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, roles: ['admin', 'cashier'] },
    { name: 'Mesas', path: '/mesas', icon: <Coffee size={20} />, roles: ['admin', 'waiter'] },
    { name: 'Comandas', path: '/comandas', icon: <ClipboardList size={20} />, roles: ['admin', 'kitchen', 'waiter'] },
    { name: 'PDV', path: '/pdv', icon: <CreditCard size={20} />, roles: ['admin', 'cashier'] },
    { name: 'Cardápio', path: '/cardapio', icon: <ShoppingBag size={20} />, roles: ['admin', 'stock'] },
    { name: 'Estoque', path: '/estoque', icon: <ChefHat size={20} />, roles: ['admin', 'stock'] },
    { name: 'Pedidos iFood', path: '/ifood', icon: <ShoppingBag size={20} />, roles: ['admin', 'kitchen'] },
    { name: 'Relatórios', path: '/relatorios', icon: <PieChart size={20} />, roles: ['admin', 'cashier'] },
    { name: 'Cardápio Online', path: '/cardapio-online', icon: <QrCode size={20} />, roles: ['admin'] },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Return just the outlet for fullscreen pages
  if (isPDV || isComandas) return <Outlet />;

  return (
    <div className={`min-h-screen bg-gray-100 flex ${theme === 'dark' ? 'dark' : ''}`}>
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-gray-200 text-gray-800">
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-300">
          <div className="flex items-center space-x-2">
            <ChefHat size={28} className="text-gray-700" />
            <span className="text-lg font-semibold">Chef Comanda</span>
          </div>
        </div>
        <div className="flex flex-col flex-grow overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  location.pathname === item.path
                    ? 'bg-gray-300 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-300 hover:text-gray-900'
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Sidebar Mobile */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50" onClick={toggleSidebar}></div>
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-gray-200 text-gray-800">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-300">
            <div className="flex items-center space-x-2">
              <ChefHat size={28} className="text-gray-700" />
              <span className="text-lg font-semibold">Chef Comanda</span>
            </div>
            <button onClick={toggleSidebar} className="text-gray-700">
              <X size={24} />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto">
            <nav className="px-2 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                    location.pathname === item.path
                      ? 'bg-gray-300 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-300 hover:text-gray-900'
                  }`}
                  onClick={toggleSidebar}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="shadow-sm z-10 bg-white dark:bg-gray-800">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={toggleSidebar} className="md:hidden text-gray-700 dark:text-gray-300">
                  <Menu size={24} />
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleTheme}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  title="Alternar tema"
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <button
                  className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  title="Notificações"
                >
                  <Bell size={20} />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                </button>

                <ProfileDropdown />
              </div>
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