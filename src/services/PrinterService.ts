export class PrinterService {
  private static instance: PrinterService;
  private printerName: string = 'Impressora Térmica - Cozinha';

  private constructor() {}

  static getInstance(): PrinterService {
    if (!PrinterService.instance) {
      PrinterService.instance = new PrinterService();
    }
    return PrinterService.instance;
  }

  setPrinter(printerName: string) {
    this.printerName = printerName;
  }

  async printComanda(mesaId: number, itens: any[]) {
    // Simulação de impressão
    console.log(`Imprimindo comanda da mesa ${mesaId} na impressora ${this.printerName}`);
    console.log('Itens:', itens);
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  }

  async printRecibo(mesaId: number, total: number, formaPagamento: string) {
    // Simulação de impressão de recibo
    console.log(`Imprimindo recibo da mesa ${mesaId}`);
    console.log(`Total: R$ ${total}`);
    console.log(`Forma de pagamento: ${formaPagamento}`);
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  }
}

export default PrinterService.getInstance();