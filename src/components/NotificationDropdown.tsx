import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';

const NotificationDropdown: React.FC = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        title="Notificações"
      >
        <Bell size={20} />
        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-semibold">
            Notificações
          </div>
          <ul className="max-h-60 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
            <li className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
              Você recebeu um novo pedido.
            </li>
            <li className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
              Um item do estoque está com baixa quantidade.
            </li>
            <li className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
              Novo usuário cadastrado.
            </li>
          </ul>
          <div className="p-2 text-center text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
            Ver todas
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
