import React, { useState, useEffect } from 'react';
import { 
  X, Printer, Usb, Wifi, Settings, TestTube, 
  CheckCircle, XCircle, AlertTriangle, Plus,
  Trash2, Edit, Save, RefreshCw, Zap, Monitor,
  Copy, Volume2, Power, Cable, Bluetooth
} from 'lucide-react';
import Button from '../ui/Button';
import ThermalPrinterService, { PrinterDevice, PrinterConfig } from '../../services/ThermalPrinterService';
import toast from 'react-hot-toast';

interface PrinterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrinterConfigModal: React.FC<PrinterConfigModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'devices' | 'config'>('devices');
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden border border-white/20 dark:border-gray-700/50">
          {/* Header */}
          <div className="relative overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="relative flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-6">
                    <Printer size={32} className="text-white" />
                  </div>
                  <div className="text-white">
                    <h2 className="text-3xl font-bold">
                      Configuração de Impressoras Térmicas
                    </h2>
                    <p className="text-blue-100 text-lg">
                      Configure impressoras para cozinha e pagamentos
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 text-white/70 hover:text-white hover:bg-white/20 rounded-2xl transition-colors"
                >
                  <X size={28} />
                </button>
              </div>
            </div>
          </div>

          {/* Suporte do Navegador */}
          {!browserSupport.supported && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-6 m-6 rounded-2xl">
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

          {/* Tabs */}
          <div className="bg-gray-50/80 dark:bg-gray-700/80 border-b border-gray-200/50 dark:border-gray-600/50">
            <div className="flex">
              <button
                onClick={() => setActiveTab('devices')}
                className={`flex-1 py-6 px-8 text-center font-bold text-lg transition-all duration-300 ${
                  activeTab === 'devices'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-4 border-blue-600 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  <Usb className="w-6 h-6" />
                  <span>Conectar Dispositivos</span>
                  <span className="text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                    {connectedDevices.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`flex-1 py-6 px-8 text-center font-bold text-lg transition-all duration-300 ${
                  activeTab === 'config'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-4 border-blue-600 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  <Settings className="w-6 h-6" />
                  <span>Configurar Impressoras</span>
                  <span className="text-sm bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-3 py-1 rounded-full">
                    {printerConfigs.length}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="p-8 overflow-y-auto max-h-[calc(95vh-280px)]">
            {activeTab === 'devices' ? (
              <div className="space-y-8">
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
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                      <Zap className="w-6 h-6 text-yellow-500 mr-3" />
                      Conectar Impressoras
                    </h3>
                    <Button
                      variant="ghost"
                      icon={<RefreshCw size={18} />}
                      onClick={loadData}
                      isLoading={loading}
                      className="bg-gray-100/80 dark:bg-gray-700/80"
                    >
                      Atualizar
                    </Button>
                  </div>

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

                {/* Dispositivos Conectados */}
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <Power className="w-6 h-6 text-green-500 mr-3" />
                    Dispositivos Conectados ({connectedDevices.length})
                  </h3>

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
            ) : (
              <div className="space-y-8">
                {/* Configurações Existentes */}
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                      <Settings className="w-6 h-6 text-blue-500 mr-3" />
                      Impressoras Configuradas ({printerConfigs.length})
                    </h3>
                    <Button
                      onClick={() => {
                        resetForm();
                        setShowConfigForm(true);
                      }}
                      className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-6 py-3 rounded-2xl font-semibold"
                      icon={<Plus size={18} />}
                    >
                      Nova Configuração
                    </Button>
                  </div>

                  {printerConfigs.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center shadow-xl mb-6">
                        <Settings className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        Nenhuma impressora configurada
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Configure suas impressoras para cozinha e pagamentos
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {printerConfigs.map((config) => (
                        <div
                          key={config.id}
                          className={`rounded-2xl p-6 border-l-4 shadow-lg hover:shadow-xl transition-all duration-300 ${
                            config.type === 'cozinha'
                              ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/30'
                              : 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <div className={`p-3 rounded-2xl mr-4 ${
                                config.type === 'cozinha' ? 'bg-orange-500' : 'bg-blue-500'
                              }`}>
                                {getTypeIcon(config.type)}
                              </div>
                              <div>
                                <h4 className={`font-bold text-lg ${
                                  config.type === 'cozinha' 
                                    ? 'text-orange-800 dark:text-orange-200' 
                                    : 'text-blue-800 dark:text-blue-200'
                                }`}>
                                  {config.name}
                                </h4>
                                <p className={`text-sm ${
                                  config.type === 'cozinha' 
                                    ? 'text-orange-600 dark:text-orange-300' 
                                    : 'text-blue-600 dark:text-blue-300'
                                }`}>
                                  {config.type === 'cozinha' ? 'Impressora da Cozinha' : 'Impressora de Pagamento'}
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
                        <X size={24} />
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
          </div>

          {/* Footer */}
          <div className="bg-gray-50/90 dark:bg-gray-700/90 backdrop-blur-sm px-8 py-6 border-t border-gray-200/50 dark:border-gray-600/50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium mb-1">💡 Dicas:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Configure uma impressora para cozinha e outra para pagamentos</li>
                  <li>• Ative a impressão automática para maior agilidade</li>
                  <li>• Use 58mm (32 chars) para impressoras pequenas, 80mm (48 chars) para maiores</li>
                </ul>
              </div>
              <Button
                variant="primary"
                onClick={onClose}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-8 py-3 rounded-2xl font-semibold"
              >
                Concluir
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterConfigModal;