import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Moon, Sun, Globe, Shield, Printer } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    language: 'pt-BR',
    notifications: {
      email: true,
      push: true,
      sound: true
    },
    printer: {
      name: 'Impressora Térmica - Cozinha',
      enabled: true,
      autoprint: true
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30
    }
  });

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg mr-4">
              <SettingsIcon size={24} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Configurações
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Personalize sua experiência
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Appearance */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Aparência
              </h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  {theme === 'dark' ? (
                    <Moon size={20} className="text-gray-500 dark:text-gray-400" />
                  ) : (
                    <Sun size={20} className="text-gray-500 dark:text-gray-400" />
                  )}
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    Tema {theme === 'dark' ? 'Escuro' : 'Claro'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  onClick={toggleTheme}
                >
                  Alterar
                </Button>
              </div>
            </div>

            {/* Language */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Idioma
              </h3>
              <div className="flex items-center space-x-4">
                <Globe size={20} className="text-gray-500 dark:text-gray-400" />
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Notificações
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell size={20} className="text-gray-500 dark:text-gray-400" />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Notificações por E-mail
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          email: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell size={20} className="text-gray-500 dark:text-gray-400" />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Notificações Push
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.push}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          push: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell size={20} className="text-gray-500 dark:text-gray-400" />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Som de Notificações
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sound}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          sound: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Printer Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Impressora
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome da Impressora
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <div className="relative flex items-stretch flex-grow focus-within:z-10">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Printer size={20} className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={settings.printer.name}
                        onChange={(e) => setSettings({
                          ...settings,
                          printer: {
                            ...settings.printer,
                            name: e.target.value
                          }
                        })}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md pl-10 sm:text-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Printer size={20} className="text-gray-500 dark:text-gray-400" />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Impressão Automática
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.printer.autoprint}
                      onChange={(e) => setSettings({
                        ...settings,
                        printer: {
                          ...settings.printer,
                          autoprint: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Security */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Segurança
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield size={20} className="text-gray-500 dark:text-gray-400" />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Autenticação em Dois Fatores
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.twoFactor}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          twoFactor: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tempo Limite da Sessão (minutos)
                  </label>
                  <select
                    value={settings.security.sessionTimeout}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        sessionTimeout: parseInt(e.target.value)
                      }
                    })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-5">
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSave}
                >
                  Salvar Configurações
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;