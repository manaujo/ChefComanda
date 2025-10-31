import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings as SettingsIcon, Moon, Sun, Globe, Bell, Shield, Lock, Printer, Monitor, Wifi, Usb, Cable, CheckCircle, XCircle, AlertTriangle, Plus, CreditCard as Edit, Trash2, TestTube, Save, RefreshCw, Zap, Power, Volume2, Settings as SettingsGear, Sparkles, Crown, Star } from "lucide-react";
import Button from "../../components/ui/Button";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../services/supabase";
import ThermalPrinterService, { PrinterDevice, PrinterConfig } from "../../services/ThermalPrinterService";
import toast from "react-hot-toast";

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Settings: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'printers' | 'security'>(
    (searchParams.get('tab') as 'general' | 'printers' | 'security') || 'general'
  );
  const [printerSubTab, setPrinterSubTab] = useState<'devices' | 'cozinha' | 'vendas'>('devices');
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  // Printer states
  const [connectedDevices, setConnectedDevices] = useState<PrinterDevice[]>([]);
  const [printerConfigs, setPrinterConfigs] = useState<PrinterConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<PrinterConfig | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [browserSupport, setBrowserSupport] = useState({ webUSB: false, webSerial: false, supported: false });
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'cozinha' as 'cozinha' | 'pagamento',
    deviceId: '',
    deviceName: '',
    paperWidth: 32 as 32 | 48,
    copies: 1,
    autoprint: true,
    enabled: true,
    connectionType: 'usb' as 'usb' | 'serial'
  });

  const [settings, setSettings] = useState({
    language: "pt-BR",
    notifications: {
      email: true,
      push: true,
      sound: true
    },
    printer: {
      name: "Impressora Térmica - Cozinha",
      enabled: true,
      autoprint: true
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30
    }
  });

  useEffect(() => {
    loadPrinterData();
    
    // Verificar se deve abrir aba específica via URL
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['general', 'printers', 'security'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as 'general' | 'printers' | 'security');
    }
  }, []);

  useEffect(() => {
    // Se chegou na aba de impressoras via URL, abrir automaticamente o formulário se não há configurações
    if (activeTab === 'printers' && printerConfigs.length === 0 && connectedDevices.length > 0) {
      setShowConfigForm(true);
    }
  }, [activeTab, printerConfigs.length, connectedDevices.length]);

  const loadPrinterData = async () => {
    try {
      setLoading(true);
      
      // Verificar suporte do navegador
      const support = ThermalPrinterService.getBrowserSupport();
      setBrowserSupport(support);
      
      // Carregar dispositivos conectados
      const devices = ThermalPrinterService.getConnectedDevices();
      setConnectedDevices(devices);
      
      // Carregar configurações
      const configs = ThermalPrinterService.getPrinterConfigs();
      setPrinterConfigs(configs);
    } catch (error) {
      console.error('Error loading printer data:', error);
      toast.error('Erro ao carregar dados das impressoras');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectUSB = async () => {
    try {
      setLoading(true);
      const device = await ThermalPrinterService.connectUSBPrinter();
      
      if (device) {
        setConnectedDevices(prev => [...prev, device]);
        toast.success(`Impressora USB conectada: ${device.name}`);
      }
    } catch (error) {
      console.error('Error connecting USB printer:', error);
      toast.error('Erro ao conectar impressora USB');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSerial = async () => {
    try {
      setLoading(true);
      const device = await ThermalPrinterService.connectSerialPrinter();
      
      if (device) {
        setConnectedDevices(prev => [...prev, device]);
        toast.success(`Porta serial conectada: ${device.name}`);
      }
    } catch (error) {
      console.error('Error connecting serial printer:', error);
      toast.error('Erro ao conectar porta serial');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (deviceId: string) => {
    try {
      await ThermalPrinterService.disconnectPrinter(deviceId);
      setConnectedDevices(prev => prev.filter(d => d.id !== deviceId));
      toast.success('Impressora desconectada');
    } catch (error) {
      console.error('Error disconnecting printer:', error);
      toast.error('Erro ao desconectar impressora');
    }
  };

  const handleSaveConfig = async () => {
    try {
      if (!formData.name || !formData.deviceId) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      const config: PrinterConfig = {
        id: editingConfig?.id || `config_${Date.now()}`,
        name: formData.name,
        type: formData.type,
        deviceId: formData.deviceId,
        deviceName: formData.deviceName,
        paperWidth: formData.paperWidth,
        copies: formData.copies,
        autoprint: formData.autoprint,
        enabled: formData.enabled,
        connectionType: formData.connectionType
      };

      ThermalPrinterService.savePrinterConfig(config);
      
      if (editingConfig) {
        setPrinterConfigs(prev => prev.map(c => c.id === config.id ? config : c));
        toast.success('Configuração atualizada com sucesso!');
      } else {
        setPrinterConfigs(prev => [...prev, config]);
        toast.success('Configuração salva com sucesso!');
      }
      
      resetForm();
      setShowConfigForm(false);
    } catch (error) {
      console.error('Error saving printer config:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  const handleEditConfig = (config: PrinterConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      type: config.type,
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      paperWidth: config.paperWidth,
      copies: config.copies,
      autoprint: config.autoprint,
      enabled: config.enabled,
      connectionType: config.connectionType
    });
    setShowConfigForm(true);
  };

  const handleDeleteConfig = (configId: string) => {
    if (confirm('Tem certeza que deseja excluir esta configuração?')) {
      ThermalPrinterService.removePrinterConfig(configId);
      setPrinterConfigs(prev => prev.filter(c => c.id !== configId));
      toast.success('Configuração excluída');
    }
  };

  const handleTestPrinter = async (config: PrinterConfig) => {
    try {
      setLoading(true);
      await ThermalPrinterService.testPrinter(config);
      toast.success('Teste de impressão enviado!');
    } catch (error) {
      console.error('Error testing printer:', error);
      toast.error('Erro no teste de impressão');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'cozinha',
      deviceId: '',
      deviceName: '',
      paperWidth: 32,
      copies: 1,
      autoprint: true,
      enabled: true,
      connectionType: 'usb'
    });
    setEditingConfig(null);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error("As senhas não conferem");
      }

      if (passwordData.newPassword.length < 6) {
        throw new Error("A senha deve ter no mínimo 6 caracteres");
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordData.currentPassword
      });

      if (signInError) {
        throw new Error("Senha atual incorreta");
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) throw updateError;

      toast.success("Senha alterada com sucesso!");
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao alterar senha"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    toast.success("Configurações salvas com sucesso!");
  };

  const getStatusIcon = (status: 'connected' | 'disconnected' | 'error') => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getTypeIcon = (type: 'cozinha' | 'pagamento') => {
    return type === 'cozinha' 
      ? <Monitor className="w-5 h-5 text-orange-500" />
      : <Printer className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <div className="w-full max-w-6xl mx-auto p-6">
        {/* Header Moderno */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <div className="relative">
              <div className="p-4 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl shadow-2xl mr-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <SettingsIcon size={32} className="text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                Configurações
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
                Personalize sua experiência no ChefComanda
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 mb-8">
          <div className="border-b border-gray-200/50 dark:border-gray-700/50">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <SettingsGear size={16} />
                  <span>Geral</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('printers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'printers'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Printer size={16} />
                  <span>Impressoras</span>
                  <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-bold">
                    {printerConfigs.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Shield size={16} />
                  <span>Segurança</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Configurações Gerais */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Aparência */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                      {theme === "dark" ? <Moon size={24} /> : <Sun size={24} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Aparência</h3>
                      <p className="text-purple-100 text-sm">Personalize a interface do sistema</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl mr-4">
                        {theme === "dark" ? (
                          <Moon size={20} className="text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Sun size={20} className="text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          Tema {theme === "dark" ? "Escuro" : "Claro"}
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {theme === "dark" ? "Interface escura para reduzir cansaço visual" : "Interface clara e limpa"}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="primary" 
                      onClick={toggleTheme}
                      className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-3 rounded-2xl font-semibold"
                    >
                      Alterar para {theme === "dark" ? "Claro" : "Escuro"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Idioma */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                      <Globe size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Idioma e Região</h3>
                      <p className="text-green-100 text-sm">Configure o idioma da interface</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-6">
                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-2xl">
                      <Globe size={20} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Idioma do Sistema
                      </label>
                      <select
                        value={settings.language}
                        onChange={(e) =>
                          setSettings({ ...settings, language: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 transition-all duration-200 text-gray-900 dark:text-white"
                      >
                        <option value="pt-BR">Português (Brasil)</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notificações */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                      <Bell size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Notificações</h3>
                      <p className="text-orange-100 text-sm">Configure como receber alertas</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl mr-4">
                        <Bell size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          Notificações por E-mail
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receber alertas importantes por e-mail
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.email}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              email: e.target.checked
                            }
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                    <div className="flex items-center">
                      <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-2xl mr-4">
                        <Bell size={20} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          Notificações Push
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Alertas em tempo real no navegador
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.push}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              push: e.target.checked
                            }
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-2xl mr-4">
                        <Volume2 size={20} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          Som de Notificações
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Tocar som ao receber novos pedidos
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.sound}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              sound: e.target.checked
                            }
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configurações de Impressoras */}
          {activeTab === 'printers' && (
            <div className="space-y-8">
              {/* Sub-abas para tipos de impressora */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="border-b border-gray-200/50 dark:border-gray-700/50">
                  <nav className="flex space-x-4 px-6">
                    <button
                      onClick={() => setPrinterSubTab('devices')}
                      className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                        printerSubTab === 'devices'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/20'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold'
                      } rounded-t-xl`}
                    >
                      <div className="flex items-center space-x-2">
                        <Usb size={16} />
                        <span>Dispositivos</span>
                        <span className={`${
                          printerSubTab === 'devices' ? 'bg-blue-500' : 'bg-gray-400'
                        } text-white px-2 py-0.5 rounded-full text-xs font-bold`}>
                          {connectedDevices.length}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setPrinterSubTab('cozinha')}
                      className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                        printerSubTab === 'cozinha'
                          ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-bold bg-orange-50/50 dark:bg-orange-900/20'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold'
                      } rounded-t-xl`}
                    >
                      <div className="flex items-center space-x-2">
                        <Monitor size={16} />
                        <span>Cozinha</span>
                        <span className={`${
                          printerSubTab === 'cozinha' ? 'bg-orange-500' : 'bg-gray-400'
                        } text-white px-2 py-0.5 rounded-full text-xs font-bold`}>
                          {printerConfigs.filter(c => c.type === 'cozinha').length}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setPrinterSubTab('vendas')}
                      className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                        printerSubTab === 'vendas'
                          ? 'border-green-500 text-green-600 dark:text-green-400 font-bold bg-green-50/50 dark:bg-green-900/20'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold'
                      } rounded-t-xl`}
                    >
                      <div className="flex items-center space-x-2">
                        <Printer size={16} />
                        <span>Vendas</span>
                        <span className={`${
                          printerSubTab === 'vendas' ? 'bg-green-500' : 'bg-gray-400'
                        } text-white px-2 py-0.5 rounded-full text-xs font-bold`}>
                          {printerConfigs.filter(c => c.type === 'pagamento').length}
                        </span>
                      </div>
                    </button>
                  </nav>
                </div>
              </div>
              {/* ABA: DISPOSITIVOS */}
              {printerSubTab === 'devices' && (
                <>
              {/* Suporte do Navegador */}
              {!browserSupport.supported && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-6 rounded-2xl">
                  <div className="flex items-start">
                    <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
                        Navegador Não Suportado
                      </h3>
                      <p className="text-red-700 dark:text-red-300 mb-3">
                        Seu navegador não suporta WebUSB ou WebSerial. Para usar impressoras térmicas, você precisa de:
                      </p>
                      <ul className="list-disc list-inside text-red-700 dark:text-red-300 space-y-1">
                        <li>Google Chrome (versão 61+)</li>
                        <li>Microsoft Edge (versão 79+)</li>
                        <li>Opera (versão 48+)</li>
                      </ul>
                      <p className="text-red-600 dark:text-red-400 mt-3 text-sm">
                        Firefox e Safari ainda não suportam essas APIs.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Suporte do Navegador */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/50">
                <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-4 flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  Suporte do Navegador
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center">
                      <Usb className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" />
                      <span className="font-medium text-gray-900 dark:text-white">WebUSB</span>
                    </div>
                    {browserSupport.webUSB ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center">
                      <Cable className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-3" />
                      <span className="font-medium text-gray-900 dark:text-white">WebSerial</span>
                    </div>
                    {browserSupport.webSerial ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Conectar Dispositivos */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-4">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <Zap size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Conectar Impressoras</h3>
                        <p className="text-blue-100 text-sm">Conecte suas impressoras térmicas</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      icon={<RefreshCw size={18} />}
                      onClick={loadPrinterData}
                      isLoading={loading}
                      className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 rounded-2xl"
                    >
                      Atualizar
                    </Button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/50">
                      <div className="flex items-center mb-4">
                        <div className="p-3 bg-blue-500 rounded-2xl mr-4">
                          <Usb className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-blue-800 dark:text-blue-200">
                            Impressora USB
                          </h4>
                          <p className="text-blue-600 dark:text-blue-300 text-sm">
                            Conecte via cabo USB
                          </p>
                        </div>
                      </div>
                      <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
                        Ideal para impressoras térmicas conectadas diretamente ao computador via USB.
                      </p>
                      <Button
                        onClick={handleConnectUSB}
                        disabled={!browserSupport.webUSB || loading}
                        isLoading={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3 font-semibold"
                        icon={<Usb size={18} />}
                      >
                        Conectar USB
                      </Button>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/50">
                      <div className="flex items-center mb-4">
                        <div className="p-3 bg-purple-500 rounded-2xl mr-4">
                          <Cable className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-purple-800 dark:text-purple-200">
                            Porta Serial
                          </h4>
                          <p className="text-purple-600 dark:text-purple-300 text-sm">
                            Conecte via COM/RS232
                          </p>
                        </div>
                      </div>
                      <p className="text-purple-700 dark:text-purple-300 text-sm mb-4">
                        Para impressoras com conexão serial ou adaptadores USB-Serial.
                      </p>
                      <Button
                        onClick={handleConnectSerial}
                        disabled={!browserSupport.webSerial || loading}
                        isLoading={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-2xl py-3 font-semibold"
                        icon={<Cable size={18} />}
                      >
                        Conectar Serial
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dispositivos Conectados */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                      <Power size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Dispositivos Conectados ({connectedDevices.length})</h3>
                      <p className="text-green-100 text-sm">Impressoras disponíveis para configuração</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {connectedDevices.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-xl mb-6">
                        <Printer className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        Nenhuma impressora conectada
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Conecte suas impressoras térmicas usando os botões acima
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {connectedDevices.map((device) => (
                        <div
                          key={device.id}
                          className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30 rounded-2xl p-6 border border-green-200/50 dark:border-green-700/50 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <div className="p-3 bg-green-500 rounded-2xl mr-3">
                                {device.type === 'usb' ? (
                                  <Usb className="w-5 h-5 text-white" />
                                ) : (
                                  <Cable className="w-5 h-5 text-white" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-green-800 dark:text-green-200">
                                  {device.name}
                                </h4>
                                <p className="text-green-600 dark:text-green-300 text-sm">
                                  {device.type.toUpperCase()}
                                </p>
                              </div>
                            </div>
                            {getStatusIcon('connected')}
                          </div>

                          <div className="space-y-2 mb-4">
                            {device.vendorId && (
                              <p className="text-sm text-green-700 dark:text-green-300">
                                Vendor ID: {device.vendorId.toString(16).toUpperCase()}
                              </p>
                            )}
                            {device.productId && (
                              <p className="text-sm text-green-700 dark:text-green-300">
                                Product ID: {device.productId.toString(16).toUpperCase()}
                              </p>
                            )}
                          </div>

                          <Button
                            onClick={() => handleDisconnect(device.id)}
                            variant="danger"
                            size="sm"
                            className="w-full rounded-2xl"
                            icon={<Power size={16} />}
                          >
                            Desconectar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>


                </>
              )}

              {/* ABA: COZINHA */}
              {printerSubTab === 'cozinha' && (
                <div className="space-y-6">
                  {/* Impressoras da Cozinha Configuradas */}
                  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center">
                          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                            <Monitor size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">Impressoras da Cozinha ({printerConfigs.filter(c => c.type === 'cozinha').length})</h3>
                            <p className="text-orange-100 text-sm">Configure impressoras para comandas</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            resetForm();
                            setFormData({ ...formData, type: 'cozinha' });
                            setShowConfigForm(true);
                          }}
                          className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 rounded-2xl px-6 py-3 font-semibold"
                          icon={<Plus size={18} />}
                          disabled={connectedDevices.length === 0}
                        >
                          Nova Impressora
                        </Button>
                      </div>
                    </div>

                    <div className="p-6">
                      {connectedDevices.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-xl mb-6">
                            <Usb className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            Nenhum dispositivo conectado
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Vá para a aba "Dispositivos" para conectar suas impressoras
                          </p>
                          <Button
                            onClick={() => setPrinterSubTab('devices')}
                            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-8 py-4 rounded-2xl font-semibold"
                            icon={<Usb size={20} />}
                          >
                            Ir para Dispositivos
                          </Button>
                        </div>
                      ) : printerConfigs.filter(c => c.type === 'cozinha').length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-full mx-auto flex items-center justify-center shadow-xl mb-6">
                            <Monitor className="w-12 h-12 text-orange-500 dark:text-orange-400" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            Nenhuma impressora de cozinha configurada
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Configure uma impressora para imprimir comandas da cozinha
                          </p>
                          <Button
                            onClick={() => {
                              resetForm();
                              setFormData({ ...formData, type: 'cozinha' });
                              setShowConfigForm(true);
                            }}
                            className="bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white px-8 py-4 rounded-2xl font-semibold"
                            icon={<Plus size={20} />}
                          >
                            Configurar Impressora de Cozinha
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {printerConfigs.filter(c => c.type === 'cozinha').map((config) => (
                            <div
                              key={config.id}
                              className="rounded-2xl p-6 border-l-4 border-orange-500 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/30 shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                  <div className="p-3 bg-orange-500 rounded-2xl mr-4">
                                    <Monitor className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-lg text-orange-800 dark:text-orange-200">
                                      {config.name}
                                    </h4>
                                    <p className="text-sm text-orange-600 dark:text-orange-300">
                                      Impressora da Cozinha
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {config.enabled ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                  )}
                                  {config.autoprint && (
                                    <Volume2 className="w-4 h-4 text-purple-500" />
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dispositivo</span>
                                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                    {config.deviceName}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Largura</span>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {config.paperWidth} chars ({config.paperWidth === 32 ? '58mm' : '80mm'})
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cópias</span>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {config.copies}x
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-impressão</span>
                                  <span className={`font-semibold ${
                                    config.autoprint ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {config.autoprint ? 'Ativada' : 'Desativada'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <Button
                                  onClick={() => handleTestPrinter(config)}
                                  variant="warning"
                                  size="sm"
                                  className="flex-1 rounded-2xl"
                                  icon={<TestTube size={16} />}
                                  disabled={!config.enabled}
                                >
                                  Testar
                                </Button>
                                <Button
                                  onClick={() => handleEditConfig(config)}
                                  variant="primary"
                                  size="sm"
                                  className="flex-1 rounded-2xl"
                                  icon={<Edit size={16} />}
                                >
                                  Editar
                                </Button>
                                <Button
                                  onClick={() => handleDeleteConfig(config.id)}
                                  variant="danger"
                                  size="sm"
                                  className="rounded-2xl"
                                  icon={<Trash2 size={16} />}
                                >
                                  Excluir
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA: VENDAS */}
              {printerSubTab === 'vendas' && (
                <div className="space-y-6">
                  {/* Impressoras de Vendas Configuradas */}
                  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center">
                          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                            <Printer size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">Impressoras de Vendas ({printerConfigs.filter(c => c.type === 'pagamento').length})</h3>
                            <p className="text-green-100 text-sm">Configure impressoras para cupons fiscais</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            resetForm();
                            setFormData({ ...formData, type: 'pagamento' });
                            setShowConfigForm(true);
                          }}
                          className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 rounded-2xl px-6 py-3 font-semibold"
                          icon={<Plus size={18} />}
                          disabled={connectedDevices.length === 0}
                        >
                          Nova Impressora
                        </Button>
                      </div>
                    </div>

                    <div className="p-6">
                      {connectedDevices.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-xl mb-6">
                            <Usb className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            Nenhum dispositivo conectado
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Vá para a aba "Dispositivos" para conectar suas impressoras
                          </p>
                          <Button
                            onClick={() => setPrinterSubTab('devices')}
                            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-8 py-4 rounded-2xl font-semibold"
                            icon={<Usb size={20} />}
                          >
                            Ir para Dispositivos
                          </Button>
                        </div>
                      ) : printerConfigs.filter(c => c.type === 'pagamento').length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/30 dark:to-emerald-800/30 rounded-full mx-auto flex items-center justify-center shadow-xl mb-6">
                            <Printer className="w-12 h-12 text-green-500 dark:text-green-400" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            Nenhuma impressora de vendas configurada
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Configure uma impressora para imprimir cupons de vendas
                          </p>
                          <Button
                            onClick={() => {
                              resetForm();
                              setFormData({ ...formData, type: 'pagamento' });
                              setShowConfigForm(true);
                            }}
                            className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-8 py-4 rounded-2xl font-semibold"
                            icon={<Plus size={20} />}
                          >
                            Configurar Impressora de Vendas
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {printerConfigs.filter(c => c.type === 'pagamento').map((config) => (
                            <div
                              key={config.id}
                              className="rounded-2xl p-6 border-l-4 border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30 shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                  <div className="p-3 bg-green-500 rounded-2xl mr-4">
                                    <Printer className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-lg text-green-800 dark:text-green-200">
                                      {config.name}
                                    </h4>
                                    <p className="text-sm text-green-600 dark:text-green-300">
                                      Impressora de Vendas
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {config.enabled ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                  )}
                                  {config.autoprint && (
                                    <Volume2 className="w-4 h-4 text-purple-500" />
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dispositivo</span>
                                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                    {config.deviceName}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Largura</span>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {config.paperWidth} chars ({config.paperWidth === 32 ? '58mm' : '80mm'})
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cópias</span>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {config.copies}x
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-impressão</span>
                                  <span className={`font-semibold ${
                                    config.autoprint ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {config.autoprint ? 'Ativada' : 'Desativada'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <Button
                                  onClick={() => handleTestPrinter(config)}
                                  variant="warning"
                                  size="sm"
                                  className="flex-1 rounded-2xl"
                                  icon={<TestTube size={16} />}
                                  disabled={!config.enabled}
                                >
                                  Testar
                                </Button>
                                <Button
                                  onClick={() => handleEditConfig(config)}
                                  variant="primary"
                                  size="sm"
                                  className="flex-1 rounded-2xl"
                                  icon={<Edit size={16} />}
                                >
                                  Editar
                                </Button>
                                <Button
                                  onClick={() => handleDeleteConfig(config.id)}
                                  variant="danger"
                                  size="sm"
                                  className="rounded-2xl"
                                  icon={<Trash2 size={16} />}
                                >
                                  Excluir
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Formulário de Configuração */}
              {showConfigForm && (
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {editingConfig ? 'Editar Configuração' : 'Nova Configuração'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowConfigForm(false);
                        resetForm();
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl"
                    >
                      <XCircle size={24} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Nome da Configuração
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
                        placeholder="Ex: Impressora Cozinha Principal"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Tipo de Impressora
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'cozinha' | 'pagamento' })}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
                      >
                        <option value="cozinha">Cozinha (Comandas)</option>
                        <option value="pagamento">Pagamento (Notinhas)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Dispositivo
                      </label>
                      <select
                        value={formData.deviceId}
                        onChange={(e) => {
                          const device = connectedDevices.find(d => d.id === e.target.value);
                          setFormData({ 
                            ...formData, 
                            deviceId: e.target.value,
                            deviceName: device?.name || '',
                            connectionType: device?.type || 'usb'
                          });
                        }}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
                        required
                      >
                        <option value="">Selecione um dispositivo</option>
                        {connectedDevices.map(device => (
                          <option key={device.id} value={device.id}>
                            {device.name} ({device.type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Largura do Papel
                      </label>
                      <select
                        value={formData.paperWidth}
                        onChange={(e) => setFormData({ ...formData, paperWidth: parseInt(e.target.value) as 32 | 48 })}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
                      >
                        <option value={32}>32 caracteres (58mm)</option>
                        <option value={48}>48 caracteres (80mm)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Número de Cópias
                      </label>
                      <select
                        value={formData.copies}
                        onChange={(e) => setFormData({ ...formData, copies: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white"
                      >
                        <option value={1}>1 cópia</option>
                        <option value={2}>2 cópias</option>
                        <option value={3}>3 cópias</option>
                        <option value={4}>4 cópias</option>
                        <option value={5}>5 cópias</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center space-x-6">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.autoprint}
                            onChange={(e) => setFormData({ ...formData, autoprint: e.target.checked })}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                            Impressão Automática
                          </span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.enabled}
                            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                            className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                            Impressora Ativada
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 mt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowConfigForm(false);
                        resetForm();
                      }}
                      className="flex-1 bg-gray-100/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl py-4 font-semibold"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveConfig}
                      className="flex-1 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white rounded-2xl py-4 font-semibold"
                      icon={<Save size={18} />}
                    >
                      {editingConfig ? 'Atualizar' : 'Salvar'} Configuração
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Segurança */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Segurança</h3>
                      <p className="text-red-100 text-sm">Proteja sua conta e dados</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                    <div className="flex items-center">
                      <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-2xl mr-4">
                        <Shield size={20} className="text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          Autenticação em Dois Fatores
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Adicione uma camada extra de segurança
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.security.twoFactor}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            security: {
                              ...settings.security,
                              twoFactor: e.target.checked
                            }
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl mr-4">
                          <Lock size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            Alterar Senha
                          </span>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Mantenha sua conta segura com uma senha forte
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        icon={<Lock size={16} />}
                        onClick={() => setShowPasswordModal(true)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-3 rounded-2xl font-semibold"
                      >
                        Alterar Senha
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botão de Salvar */}
          <div className="flex justify-end pt-6">
            <Button 
              variant="primary" 
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              icon={<Save size={20} />}
            >
              Salvar Configurações
            </Button>
          </div>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-lg border border-white/20 dark:border-gray-700/50">
                <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 p-6">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                        <Lock size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Alterar Senha</h3>
                        <p className="text-red-100 text-sm">Mantenha sua conta segura</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPasswordModal(false)}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <XCircle size={24} />
                    </button>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Senha Atual
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all duration-200 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all duration-200 text-gray-900 dark:text-white"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all duration-200 text-gray-900 dark:text-white"
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowPasswordModal(false)}
                      className="flex-1 bg-gray-100/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl py-4 font-semibold"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={loading}
                      className="flex-1 bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white rounded-2xl py-4 font-semibold"
                    >
                      Alterar Senha
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Informações Adicionais */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 text-white text-center shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-3xl">
                <Crown size={32} className="text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Star className="w-3 h-3 text-blue-800" />
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Precisa de Ajuda?
          </h2>
          <p className="text-blue-100 mb-6 text-lg">
            Nossa equipe está sempre pronta para ajudar você a configurar e usar o ChefComanda
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="ghost"
              onClick={() => window.open('https://wa.me/5562982760471', '_blank')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 rounded-2xl px-8 py-4 font-semibold text-lg"
              icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>}
            >
              WhatsApp: (62) 98276-0471
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.open('mailto:chefcomandaoficial@gmail.com', '_blank')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 rounded-2xl px-8 py-4 font-semibold text-lg"
              icon={<Bell size={18} />}
            >
              chefcomandaoficial@gmail.com
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;