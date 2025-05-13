import React, { useState, useEffect, useRef } from 'react';
import { Bell, Package, AlertTriangle, DollarSign, X } from 'lucide-react';
import { useRestaurante } from '../contexts/RestauranteContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'estoque' | 'delivery' | 'caixa' | 'sistema';
  read: boolean;
  createdAt: string;
}

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { alertasEstoque } = useRestaurante();

  useEffect(() => {
    // Convert alertas to notifications format
    const estoqueNotifications = alertasEstoque.map(alerta => ({
      id: alerta.id.toString(),
      title: 'Alerta de Estoque',
      message: `${alerta.produto} está com estoque baixo (${alerta.quantidade} unidades)`,
      type: 'estoque' as const,
      read: false,
      createdAt: alerta.data
    }));

    setNotifications(estoqueNotifications);
  }, [alertasEstoque]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (notificationId: string) => {
    setNotifications(notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    ));
  };

  const clearAll = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'estoque':
        return <AlertTriangle size={16} className="text-orange-500" />;
      case 'delivery':
        return <Package size={16} className="text-blue-500" />;
      case 'caixa':
        return <DollarSign size={16} className="text-green-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-700 focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Notificações</h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nenhuma notificação
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      notification.read ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {getIcon(notification.type)}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;