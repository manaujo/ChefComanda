import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle, XCircle, AlertTriangle, Settings, Cog } from 'lucide-react';
import ThermalPrinterService from '../../services/ThermalPrinterService';
import { useNavigate } from 'react-router-dom';

interface PrinterStatusIndicatorProps {
  onOpenConfig: () => void;
}

const PrinterStatusIndicator: React.FC<PrinterStatusIndicatorProps> = ({ onOpenConfig }) => {
  const navigate = useNavigate();
  const [printerStatus, setPrinterStatus] = useState({
    cozinha: { configured: false, connected: false, name: '' },
    pagamento: { configured: false, connected: false, name: '' }
  });

  useEffect(() => {
    checkPrinterStatus();
    
    // Verificar status a cada 30 segundos
    const interval = setInterval(checkPrinterStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkPrinterStatus = async () => {
    try {
      const configs = ThermalPrinterService.getPrinterConfigs();
      const cozinhaConfig = configs.find(c => c.type === 'cozinha' && c.enabled);
      const pagamentoConfig = configs.find(c => c.type === 'pagamento' && c.enabled);

      const newStatus = {
        cozinha: {
          configured: !!cozinhaConfig,
          connected: cozinhaConfig ? await ThermalPrinterService.checkPrinterStatus(cozinhaConfig.deviceId) === 'connected' : false,
          name: cozinhaConfig?.name || ''
        },
        pagamento: {
          configured: !!pagamentoConfig,
          connected: pagamentoConfig ? await ThermalPrinterService.checkPrinterStatus(pagamentoConfig.deviceId) === 'connected' : false,
          name: pagamentoConfig?.name || ''
        }
      };

      setPrinterStatus(newStatus);
    } catch (error) {
      console.error('Error checking printer status:', error);
    }
  };

  const getOverallStatus = () => {
    const cozinhaOk = printerStatus.cozinha.configured && printerStatus.cozinha.connected;
    const pagamentoOk = printerStatus.pagamento.configured && printerStatus.pagamento.connected;
    
    if (cozinhaOk && pagamentoOk) return 'all-connected';
    if (cozinhaOk || pagamentoOk) return 'partial';
    if (printerStatus.cozinha.configured || printerStatus.pagamento.configured) return 'configured';
    return 'none';
  };

  const getStatusIcon = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'all-connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'configured':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Printer className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'all-connected':
        return 'Impressoras Conectadas';
      case 'partial':
        return 'Parcialmente Conectado';
      case 'configured':
        return 'Configurado (Desconectado)';
      default:
        return 'Não Configurado';
    }
  };

  const getStatusColor = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'all-connected':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'partial':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
      case 'configured':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-700/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  };

  const handleConfigClick = () => {
    // Navegar para a página de configurações na aba de impressoras
    navigate('/dashboard/profile/settings?tab=printers');
  };

  return (
    <button
      onClick={handleConfigClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${getStatusColor()}`}
      title="Configurar Impressoras Térmicas"
    >
      {getStatusIcon()}
      <div className="text-left">
        <p className="text-sm font-bold">{getStatusText()}</p>
        <div className="text-xs opacity-80">
          {printerStatus.cozinha.configured && (
            <span className="mr-3">
              🍳 {printerStatus.cozinha.connected ? '✅' : '❌'} {printerStatus.cozinha.name}
            </span>
          )}
          {printerStatus.pagamento.configured && (
            <span>
              💰 {printerStatus.pagamento.connected ? '✅' : '❌'} {printerStatus.pagamento.name}
            </span>
          )}
        </div>
      </div>
      <Cog className="w-4 h-4 opacity-60" />
    </button>
  );
};

export default PrinterStatusIndicator;