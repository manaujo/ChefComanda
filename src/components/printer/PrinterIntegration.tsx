import React from 'react';
import ThermalPrinterService from '../../services/ThermalPrinterService';
import { useRestaurante } from '../../contexts/RestauranteContext';

// Hook para integração automática com impressoras
export const usePrinterIntegration = () => {
  const { restaurante } = useRestaurante();

  const printKitchenOrder = async (
    mesa: number,
    items: Array<{ nome: string; quantidade: number; observacao?: string }>,
    observacoes?: string
  ) => {
    try {
      await ThermalPrinterService.printKitchenOrder(
        restaurante?.nome || 'ChefComanda',
        mesa,
        items,
        observacoes
      );
    } catch (error) {
      console.warn('Erro na impressão da cozinha:', error);
      // Não falhar a operação por causa da impressão
    }
  };

  const printPaymentReceipt = async (
    mesa: number,
    items: Array<{ nome: string; quantidade: number; preco: number; observacao?: string }>,
    total: number,
    formaPagamento: string
  ) => {
    try {
      await ThermalPrinterService.printPaymentReceipt(
        restaurante?.nome || 'ChefComanda',
        mesa,
        items,
        total,
        formaPagamento
      );
    } catch (error) {
      console.warn('Erro na impressão do pagamento:', error);
      // Não falhar a operação por causa da impressão
    }
  };

  return {
    printKitchenOrder,
    printPaymentReceipt
  };
};

// Componente para status das impressoras no header
const PrinterIntegration: React.FC = () => {
  return null; // Este componente é apenas para exportar o hook
};

export default PrinterIntegration;