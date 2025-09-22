// Legacy PrinterService - Migrated to ThermalPrinterService
// This file is kept for backward compatibility

import ThermalPrinterService from './ThermalPrinterService';

export class PrinterService {
  private static instance: PrinterService;

  private constructor() {}

  static getInstance(): PrinterService {
    if (!PrinterService.instance) {
      PrinterService.instance = new PrinterService();
    }
    return PrinterService.instance;
  }

  setPrinter(printerName: string) {
    console.log('Legacy setPrinter called, use ThermalPrinterService instead');
  }

  async printComanda(mesaId: number, itens: any[]) {
    console.log('Legacy printComanda called, use ThermalPrinterService.printKitchenOrder instead');
    
    try {
      await ThermalPrinterService.printKitchenOrder(
        'ChefComanda',
        mesaId,
        itens.map(item => ({
          nome: item.nome || item.produto_nome,
          quantidade: item.quantidade,
          observacao: item.observacao
        }))
      );
      return true;
    } catch (error) {
      console.error('Error in legacy printComanda:', error);
      return false;
    }
  }

  async printRecibo(mesaId: number, total: number, formaPagamento: string) {
    console.log('Legacy printRecibo called, use ThermalPrinterService.printPaymentReceipt instead');
    
    try {
      await ThermalPrinterService.printPaymentReceipt(
        'ChefComanda',
        mesaId,
        [],
        total,
        formaPagamento
      );
      return true;
    } catch (error) {
      console.error('Error in legacy printRecibo:', error);
      return false;
    }
  }
}

export default PrinterService.getInstance();