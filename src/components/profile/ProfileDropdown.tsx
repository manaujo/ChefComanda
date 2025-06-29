import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Settings, Building2, Users, LogOut,
  ChevronDown, Moon, Sun, CreditCard, Crown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const ProfileDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, userRole, displayName, signOut, currentPlan } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 focus:outline-none"
      >
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
          <User size={16} />
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {displayName || 'Usuário'}
          </p>
          <div className="flex items-center space-x-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {userRole}
            </p>
            {currentPlan && (
              <>
                <span className="text-xs text-gray-400">•</span>
                <div className="flex items-center">
                  <Crown size={10} className="text-yellow-500 mr-1" />
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    {currentPlan}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
        <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50">
          {userRole === 'admin' && (
            <>
              <Link
                to="/profile/company"
                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                <Building2 size={16} className="mr-3" />
                Dados da Empresa
              </Link>
              <Link
                to="/profile/employees"
                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                <Users size={16} className="mr-3" />
                Funcionários
              </Link>
            </>
          )}

          <Link
            to="/profile/settings"
            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setIsOpen(false)}
          >
            <Settings size={16} className="mr-3" />
            Configurações
          </Link>
          
          {userRole === 'admin' && (
            <Link
              to="/profile/planos"
              className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setIsOpen(false)}
            >
              <CreditCard size={16} className="mr-3" />
              Planos e Assinaturas
            </Link>
          )}

          <button
            onClick={toggleTheme}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {theme === 'dark' ? (
              <Sun size={16} className="mr-3" />
            ) : (
              <Moon size={16} className="mr-3" />
            )}
            {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
          </button>

          <hr className="my-1 border-gray-200 dark:border-gray-700" />

          <button
            onClick={() => {
              signOut();
              setIsOpen(false);
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <LogOut size={16} className="mr-3" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;