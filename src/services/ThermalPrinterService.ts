import { supabase } from './supabase';

export interface PrinterDevice {
  id: string;
  name: string;
  type: 'usb' | 'serial';
  vendorId?: number;
  productId?: number;
  path?: string;
  connected: boolean;
}

export interface PrinterConfig {
  id: string;
  name: string;
  type: 'cozinha' | 'pagamento';
  deviceId: string;
  deviceName: string;
  paperWidth: 32 | 48; // characters
  copies: number;
  autoprint: boolean;
  enabled: boolean;
  connectionType: 'usb' | 'serial';
}

export interface PrintData {
  type: 'comanda' | 'pagamento';
  restaurantName: string;
  data: {
    mesa?: number;
    pedido?: number;
    cliente?: string;
    items: Array<{
      nome: string;
      quantidade: number;
      preco?: number;
      observacao?: string;
    }>;
    total?: number;
    formaPagamento?: string;
    observacoes?: string;
  };
}

class ThermalPrinterService {
  private static instance: ThermalPrinterService;
  private connectedDevices: Map<string, any> = new Map();
  private printerConfigs: Map<string, PrinterConfig> = new Map();
  private isWebUSBSupported = false;
  private isWebSerialSupported = false;

  private constructor() {
    this.checkBrowserSupport();
    this.loadConfigurations();
  }

  static getInstance(): ThermalPrinterService {
    if (!ThermalPrinterService.instance) {
      ThermalPrinterService.instance = new ThermalPrinterService();
    }
    return ThermalPrinterService.instance;
  }

  private checkBrowserSupport() {
    this.isWebUSBSupported = 'usb' in navigator;
    this.isWebSerialSupported = 'serial' in navigator;
    
    console.log('🖨️ Printer Support Check:', {
      webUSB: this.isWebUSBSupported,
      webSerial: this.isWebSerialSupported
    });
  }

  private async loadConfigurations() {
    try {
      const saved = localStorage.getItem('thermal_printer_configs');
      if (saved) {
        const configs = JSON.parse(saved);
        configs.forEach((config: PrinterConfig) => {
          this.printerConfigs.set(config.id, config);
        });
      }
    } catch (error) {
      console.error('Error loading printer configurations:', error);
    }
  }

  private saveConfigurations() {
    try {
      const configs = Array.from(this.printerConfigs.values());
      localStorage.setItem('thermal_printer_configs', JSON.stringify(configs));
    } catch (error) {
      console.error('Error saving printer configurations:', error);
    }
  }

  // Detectar impressoras USB
  async detectUSBPrinters(): Promise<PrinterDevice[]> {
    if (!this.isWebUSBSupported) {
      throw new Error('WebUSB não é suportado neste navegador');
    }

    try {
      const devices = await (navigator as any).usb.getDevices();
      const printers: PrinterDevice[] = [];

      // Filtros para impressoras térmicas conhecidas
      const printerFilters = [
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x0dd4 }, // Custom
        { vendorId: 0x0519 }, // Citizen
        { vendorId: 0x0fe6 }, // ICS Advent
        { vendorId: 0x154f }, // Rongta
        { vendorId: 0x0483 }, // STMicroelectronics
        { vendorId: 0x1fc9 }, // NXP Semiconductors
      ];

      for (const device of devices) {
        const isKnownPrinter = printerFilters.some(
          filter => filter.vendorId === device.vendorId
        );

        if (isKnownPrinter || device.productName?.toLowerCase().includes('printer')) {
          printers.push({
            id: `usb_${device.vendorId}_${device.productId}`,
            name: device.productName || `USB Printer (${device.vendorId}:${device.productId})`,
            type: 'usb',
            vendorId: device.vendorId,
            productId: device.productId,
            connected: device.opened
          });
        }
      }

      return printers;
    } catch (error) {
      console.error('Error detecting USB printers:', error);
      return [];
    }
  }

  // Conectar impressora USB
  async connectUSBPrinter(): Promise<PrinterDevice | null> {
    if (!this.isWebUSBSupported) {
      throw new Error('WebUSB não é suportado neste navegador');
    }

    try {
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0dd4 }, // Custom
          { vendorId: 0x0519 }, // Citizen
          { vendorId: 0x0fe6 }, // ICS Advent
          { vendorId: 0x154f }, // Rongta
          { vendorId: 0x0483 }, // STMicroelectronics
          { vendorId: 0x1fc9 }, // NXP Semiconductors
        ]
      });

      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);

      const printerId = `usb_${device.vendorId}_${device.productId}`;
      this.connectedDevices.set(printerId, device);

      return {
        id: printerId,
        name: device.productName || `USB Printer (${device.vendorId}:${device.productId})`,
        type: 'usb',
        vendorId: device.vendorId,
        productId: device.productId,
        connected: true
      };
    } catch (error) {
      console.error('Error connecting USB printer:', error);
      throw error;
    }
  }

  // Detectar portas seriais
  async detectSerialPorts(): Promise<PrinterDevice[]> {
    if (!this.isWebSerialSupported) {
      throw new Error('WebSerial não é suportado neste navegador');
    }

    try {
      const ports = await (navigator as any).serial.getPorts();
      const printers: PrinterDevice[] = [];

      for (const port of ports) {
        const info = port.getInfo();
        printers.push({
          id: `serial_${info.usbVendorId || 'unknown'}_${info.usbProductId || 'unknown'}`,
          name: `Serial Port (${info.usbVendorId || 'COM'})`,
          type: 'serial',
          path: 'COM',
          connected: port.readable !== null
        });
      }

      return printers;
    } catch (error) {
      console.error('Error detecting serial ports:', error);
      return [];
    }
  }

  // Conectar porta serial
  async connectSerialPrinter(): Promise<PrinterDevice | null> {
    if (!this.isWebSerialSupported) {
      throw new Error('WebSerial não é suportado neste navegador');
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });

      const info = port.getInfo();
      const printerId = `serial_${info.usbVendorId || 'unknown'}_${info.usbProductId || 'unknown'}`;
      
      this.connectedDevices.set(printerId, port);

      return {
        id: printerId,
        name: `Serial Port (${info.usbVendorId || 'COM'})`,
        type: 'serial',
        path: 'COM',
        connected: true
      };
    } catch (error) {
      console.error('Error connecting serial printer:', error);
      throw error;
    }
  }

  // Salvar configuração de impressora
  savePrinterConfig(config: PrinterConfig) {
    this.printerConfigs.set(config.id, config);
    this.saveConfigurations();
  }

  // Obter configurações
  getPrinterConfigs(): PrinterConfig[] {
    return Array.from(this.printerConfigs.values());
  }

  // Obter configuração por tipo
  getPrinterConfigByType(type: 'cozinha' | 'pagamento'): PrinterConfig | null {
    return Array.from(this.printerConfigs.values()).find(
      config => config.type === type && config.enabled
    ) || null;
  }

  // Remover configuração
  removePrinterConfig(id: string) {
    this.printerConfigs.delete(id);
    this.saveConfigurations();
  }

  // Gerar comando ESC/POS para notinha de pagamento
  private generatePaymentReceipt(data: PrintData, paperWidth: number): Uint8Array {
    const commands: number[] = [];
    
    // Inicializar impressora
    commands.push(...[0x1B, 0x40]); // ESC @
    
    // Centralizar e imprimir cabeçalho
    commands.push(...[0x1B, 0x61, 0x01]); // ESC a 1 (centralizar)
    commands.push(...this.stringToBytes(data.restaurantName.toUpperCase()));
    commands.push(...[0x0A, 0x0A]); // LF LF
    
    // Alinhar à esquerda
    commands.push(...[0x1B, 0x61, 0x00]); // ESC a 0 (esquerda)
    
    // Data e hora
    const now = new Date();
    const dataStr = `Data: ${now.toLocaleDateString('pt-BR')}`;
    const horaStr = `Hora: ${now.toLocaleTimeString('pt-BR')}`;
    commands.push(...this.stringToBytes(dataStr));
    commands.push(0x0A);
    commands.push(...this.stringToBytes(horaStr));
    commands.push(...[0x0A, 0x0A]);

    // Mesa ou pedido
    if (data.data.mesa) {
      commands.push(...this.stringToBytes(`Mesa: ${data.data.mesa}`));
    } else if (data.data.pedido) {
      commands.push(...this.stringToBytes(`Pedido: #${data.data.pedido}`));
    }
    if (data.data.cliente) {
      commands.push(0x0A);
      commands.push(...this.stringToBytes(`Cliente: ${data.data.cliente}`));
    }
    commands.push(...[0x0A, 0x0A]);

    // Linha separadora
    const separator = '-'.repeat(paperWidth);
    commands.push(...this.stringToBytes(separator));
    commands.push(0x0A);

    // Itens
    data.data.items.forEach(item => {
      const itemLine = this.formatItemLine(
        `${item.quantidade}x ${item.nome}`,
        item.preco ? `R$ ${item.preco.toFixed(2)}` : '',
        paperWidth
      );
      commands.push(...this.stringToBytes(itemLine));
      commands.push(0x0A);
      
      if (item.observacao) {
        commands.push(...this.stringToBytes(`   OBS: ${item.observacao}`));
        commands.push(0x0A);
      }
    });

    // Linha separadora
    commands.push(...this.stringToBytes(separator));
    commands.push(0x0A);

    // Total (se for pagamento)
    if (data.type === 'pagamento' && data.data.total) {
      commands.push(...[0x1B, 0x45, 0x01]); // ESC E 1 (negrito)
      const totalLine = this.formatItemLine('TOTAL:', `R$ ${data.data.total.toFixed(2)}`, paperWidth);
      commands.push(...this.stringToBytes(totalLine));
      commands.push(...[0x1B, 0x45, 0x00]); // ESC E 0 (normal)
      commands.push(0x0A);

      if (data.data.formaPagamento) {
        commands.push(...this.stringToBytes(`Pagamento: ${data.data.formaPagamento}`));
        commands.push(...[0x0A, 0x0A]);
      }
    }

    // Observações gerais
    if (data.data.observacoes) {
      commands.push(...this.stringToBytes('OBSERVACOES GERAIS:'));
      commands.push(0x0A);
      commands.push(...this.stringToBytes(data.data.observacoes));
      commands.push(...[0x0A, 0x0A]);
    }

    // Rodapé
    if (data.type === 'pagamento') {
      commands.push(...[0x1B, 0x61, 0x01]); // Centralizar
      commands.push(...this.stringToBytes('Obrigado pela preferencia!'));
      commands.push(...[0x0A, 0x0A]);
    } else {
      commands.push(...[0x1B, 0x61, 0x01]); // Centralizar
      commands.push(...this.stringToBytes('PEDIDO PARA COZINHA'));
      commands.push(...[0x0A, 0x0A]);
    }

    // Cortar papel
    commands.push(...[0x1D, 0x56, 0x42, 0x00]); // GS V B 0

    return new Uint8Array(commands);
  }

  // Gerar comando ESC/POS para comanda da cozinha
  private generateKitchenReceipt(data: PrintData, paperWidth: number): Uint8Array {
    const commands: number[] = [];
    
    // Inicializar impressora
    commands.push(...[0x1B, 0x40]); // ESC @
    
    // Centralizar e imprimir cabeçalho
    commands.push(...[0x1B, 0x61, 0x01]); // ESC a 1 (centralizar)
    commands.push(...[0x1B, 0x45, 0x01]); // ESC E 1 (negrito)
    commands.push(...this.stringToBytes(data.restaurantName.toUpperCase()));
    commands.push(...[0x1B, 0x45, 0x00]); // ESC E 0 (normal)
    commands.push(...[0x0A, 0x0A]);
    
    // Alinhar à esquerda
    commands.push(...[0x1B, 0x61, 0x00]); // ESC a 0 (esquerda)
    
    // Data e hora
    const now = new Date();
    const dataStr = `Data: ${now.toLocaleDateString('pt-BR')}`;
    const horaStr = `Hora: ${now.toLocaleTimeString('pt-BR')}`;
    commands.push(...this.stringToBytes(dataStr));
    commands.push(0x0A);
    commands.push(...this.stringToBytes(horaStr));
    commands.push(...[0x0A, 0x0A]);

    // Mesa ou pedido
    if (data.data.mesa) {
      commands.push(...[0x1B, 0x45, 0x01]); // Negrito
      commands.push(...this.stringToBytes(`Mesa: ${data.data.mesa}`));
      commands.push(...[0x1B, 0x45, 0x00]); // Normal
    } else if (data.data.pedido) {
      commands.push(...[0x1B, 0x45, 0x01]); // Negrito
      commands.push(...this.stringToBytes(`Pedido: #${data.data.pedido}`));
      commands.push(...[0x1B, 0x45, 0x00]); // Normal
    }
    if (data.data.cliente) {
      commands.push(0x0A);
      commands.push(...this.stringToBytes(`Cliente: ${data.data.cliente}`));
    }
    commands.push(...[0x0A, 0x0A]);

    // Título da seção
    commands.push(...[0x1B, 0x61, 0x01]); // Centralizar
    commands.push(...[0x1B, 0x45, 0x01]); // Negrito
    commands.push(...this.stringToBytes('PEDIDO PARA COZINHA'));
    commands.push(...[0x1B, 0x45, 0x00]); // Normal
    commands.push(...[0x0A, 0x0A]);

    // Alinhar à esquerda
    commands.push(...[0x1B, 0x61, 0x00]);

    // Linha separadora
    const separator = '-'.repeat(paperWidth);
    commands.push(...this.stringToBytes(separator));
    commands.push(0x0A);

    // Itens com destaque
    data.data.items.forEach(item => {
      // Item principal em negrito
      commands.push(...[0x1B, 0x45, 0x01]); // Negrito
      commands.push(...this.stringToBytes(`${item.quantidade}x ${item.nome}`));
      commands.push(...[0x1B, 0x45, 0x00]); // Normal
      commands.push(0x0A);
      
      if (item.observacao) {
        commands.push(...this.stringToBytes(`OBS: ${item.observacao}`));
        commands.push(...[0x0A, 0x0A]);
      } else {
        commands.push(0x0A);
      }
    });

    // Observações gerais
    if (data.data.observacoes) {
      commands.push(...this.stringToBytes('OBSERVACOES GERAIS:'));
      commands.push(0x0A);
      commands.push(...[0x1B, 0x45, 0x01]); // Negrito
      commands.push(...this.stringToBytes(data.data.observacoes));
      commands.push(...[0x1B, 0x45, 0x00]); // Normal
      commands.push(...[0x0A, 0x0A]);
    }

    // Linha separadora final
    commands.push(...this.stringToBytes(separator));
    commands.push(...[0x0A, 0x0A, 0x0A]);

    // Cortar papel
    commands.push(...[0x1D, 0x56, 0x42, 0x00]); // GS V B 0

    return new Uint8Array(commands);
  }

  // Converter string para bytes
  private stringToBytes(str: string): number[] {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(str));
  }

  // Formatar linha de item
  private formatItemLine(left: string, right: string, width: number): string {
    const totalLength = left.length + right.length;
    if (totalLength >= width) {
      return left.substring(0, width - right.length - 1) + ' ' + right;
    }
    const spaces = width - totalLength;
    return left + ' '.repeat(spaces) + right;
  }

  // Imprimir via USB
  private async printUSB(deviceId: string, data: Uint8Array): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error('Impressora USB não conectada');
    }

    try {
      // Encontrar endpoint de saída
      const interface_ = device.configuration.interfaces[0];
      const endpoint = interface_.alternate.endpoints.find(
        (ep: any) => ep.direction === 'out'
      );

      if (!endpoint) {
        throw new Error('Endpoint de saída não encontrado');
      }

      // Enviar dados
      await device.transferOut(endpoint.endpointNumber, data);
      console.log('✅ Impressão USB enviada com sucesso');
    } catch (error) {
      console.error('❌ Erro na impressão USB:', error);
      throw error;
    }
  }

  // Imprimir via Serial
  private async printSerial(deviceId: string, data: Uint8Array): Promise<void> {
    const port = this.connectedDevices.get(deviceId);
    if (!port) {
      throw new Error('Porta serial não conectada');
    }

    try {
      const writer = port.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      console.log('✅ Impressão Serial enviada com sucesso');
    } catch (error) {
      console.error('❌ Erro na impressão Serial:', error);
      throw error;
    }
  }

  // Imprimir documento
  async print(data: PrintData, printerType: 'cozinha' | 'pagamento'): Promise<void> {
    const config = this.getPrinterConfigByType(printerType);
    
    if (!config || !config.enabled) {
      console.log(`ℹ️ Impressora ${printerType} não configurada ou desabilitada`);
      return;
    }

    try {
      // Gerar comandos ESC/POS
      const commands = printerType === 'cozinha' 
        ? this.generateKitchenReceipt(data, config.paperWidth)
        : this.generatePaymentReceipt(data, config.paperWidth);

      // Imprimir múltiplas cópias se configurado
      for (let i = 0; i < config.copies; i++) {
        if (config.connectionType === 'usb') {
          await this.printUSB(config.deviceId, commands);
        } else {
          await this.printSerial(config.deviceId, commands);
        }
        
        // Pequena pausa entre cópias
        if (i < config.copies - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`✅ Impressão ${printerType} concluída (${config.copies} cópias)`);
    } catch (error) {
      console.error(`❌ Erro na impressão ${printerType}:`, error);
      throw error;
    }
  }

  // Testar impressora
  async testPrinter(config: PrinterConfig): Promise<void> {
    const testData: PrintData = {
      type: config.type,
      restaurantName: 'TESTE DE IMPRESSORA',
      data: {
        mesa: config.type === 'pagamento' ? 99 : undefined,
        pedido: config.type === 'cozinha' ? 999 : undefined,
        items: [
          {
            nome: 'Item de Teste',
            quantidade: 1,
            preco: config.type === 'pagamento' ? 10.00 : undefined,
            observacao: 'Teste de impressão'
          }
        ],
        total: config.type === 'pagamento' ? 10.00 : undefined,
        formaPagamento: config.type === 'pagamento' ? 'TESTE' : undefined,
        observacoes: 'Esta é uma impressão de teste'
      }
    };

    await this.print(testData, config.type);
  }

  // Verificar status da impressora
  async checkPrinterStatus(deviceId: string): Promise<'connected' | 'disconnected' | 'error'> {
    const device = this.connectedDevices.get(deviceId);
    
    if (!device) {
      return 'disconnected';
    }

    try {
      // Para USB, verificar se ainda está aberto
      if (device.opened !== undefined) {
        return device.opened ? 'connected' : 'disconnected';
      }
      
      // Para Serial, verificar se readable está disponível
      if (device.readable !== undefined) {
        return device.readable ? 'connected' : 'disconnected';
      }
      
      return 'connected';
    } catch (error) {
      console.error('Error checking printer status:', error);
      return 'error';
    }
  }

  // Impressão automática de pagamento
  async printPaymentReceipt(
    restaurantName: string,
    mesa: number,
    items: Array<{ nome: string; quantidade: number; preco: number; observacao?: string }>,
    total: number,
    formaPagamento: string
  ): Promise<void> {
    const config = this.getPrinterConfigByType('pagamento');
    
    if (!config || !config.autoprint) {
      return;
    }

    const printData: PrintData = {
      type: 'pagamento',
      restaurantName,
      data: {
        mesa,
        items,
        total,
        formaPagamento
      }
    };

    await this.print(printData, 'pagamento');
  }

  // Impressão automática de comanda
  async printKitchenOrder(
    restaurantName: string,
    mesa: number,
    items: Array<{ nome: string; quantidade: number; observacao?: string }>,
    observacoes?: string
  ): Promise<void> {
    const config = this.getPrinterConfigByType('cozinha');
    
    if (!config || !config.autoprint) {
      return;
    }

    const printData: PrintData = {
      type: 'comanda',
      restaurantName,
      data: {
        mesa,
        items,
        observacoes
      }
    };

    await this.print(printData, 'cozinha');
  }

  // Obter dispositivos conectados
  getConnectedDevices(): PrinterDevice[] {
    const devices: PrinterDevice[] = [];
    
    this.connectedDevices.forEach((device, id) => {
      const [type, ...idParts] = id.split('_');
      devices.push({
        id,
        name: device.productName || device.getInfo?.()?.usbProductId || `${type.toUpperCase()} Printer`,
        type: type as 'usb' | 'serial',
        connected: true
      });
    });

    return devices;
  }

  // Desconectar impressora
  async disconnectPrinter(deviceId: string): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    
    if (device) {
      try {
        if (device.close) {
          await device.close();
        }
        this.connectedDevices.delete(deviceId);
        console.log(`🔌 Impressora ${deviceId} desconectada`);
      } catch (error) {
        console.error('Error disconnecting printer:', error);
      }
    }
  }

  // Verificar suporte do navegador
  getBrowserSupport() {
    return {
      webUSB: this.isWebUSBSupported,
      webSerial: this.isWebSerialSupported,
      supported: this.isWebUSBSupported || this.isWebSerialSupported
    };
  }
}

export default ThermalPrinterService.getInstance();