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
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 3;

  private constructor() {
    this.checkBrowserSupport();
    this.loadConfigurations();
    this.setupEventListeners();
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
      webSerial: this.isWebSerialSupported,
      userAgent: navigator.userAgent
    });

    if (!this.isWebUSBSupported && !this.isWebSerialSupported) {
      console.warn('⚠️ Nenhuma API de impressora suportada. Use Chrome, Edge ou Opera.');
    }
  }

  private setupEventListeners() {
    if (this.isWebUSBSupported && navigator.usb) {
      navigator.usb.addEventListener('disconnect', (event: any) => {
        console.log('🔌 Dispositivo USB desconectado:', event.device);
        const deviceId = `usb_${event.device.vendorId}_${event.device.productId}`;
        this.handleDeviceDisconnect(deviceId);
      });

      navigator.usb.addEventListener('connect', (event: any) => {
        console.log('🔌 Dispositivo USB conectado:', event.device);
        const deviceId = `usb_${event.device.vendorId}_${event.device.productId}`;
        this.reconnectAttempts.set(deviceId, 0);
      });
    }

    if (this.isWebSerialSupported && navigator.serial) {
      navigator.serial.addEventListener('disconnect', (event: any) => {
        console.log('🔌 Porta serial desconectada:', event.port);
        const info = event.port.getInfo();
        const deviceId = `serial_${info.usbVendorId || 'unknown'}_${info.usbProductId || 'unknown'}`;
        this.handleDeviceDisconnect(deviceId);
      });
    }
  }

  private handleDeviceDisconnect(deviceId: string) {
    const device = this.connectedDevices.get(deviceId);
    if (device) {
      this.connectedDevices.delete(deviceId);
      console.warn(`⚠️ Impressora desconectada: ${deviceId}`);

      const attempts = this.reconnectAttempts.get(deviceId) || 0;
      if (attempts < this.maxReconnectAttempts) {
        this.reconnectAttempts.set(deviceId, attempts + 1);
        console.log(`🔄 Tentativa de reconexão ${attempts + 1}/${this.maxReconnectAttempts}`);
      }
    }
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

      // Filtros para impressoras térmicas conhecidas (mais completo)
      const printerFilters = [
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x0dd4 }, // Custom Engineering
        { vendorId: 0x0519 }, // Citizen
        { vendorId: 0x0fe6 }, // ICS Advent/Contour Design
        { vendorId: 0x154f }, // Rongta Technology
        { vendorId: 0x0483 }, // STMicroelectronics
        { vendorId: 0x1fc9 }, // NXP Semiconductors
        { vendorId: 0x0926 }, // Zjiang
        { vendorId: 0x6868 }, // Xprinter
        { vendorId: 0x1504 }, // Bixolon
        { vendorId: 0x0416 }, // Winbond Electronics
        { vendorId: 0x20d1 }, // Xiamen Hanin
        { vendorId: 0x1fc9 }, // NXP/Freescale
        { vendorId: 0x0525 }, // Netchip Technology
        { vendorId: 0x0fe6 }, // Contour Design
        { vendorId: 0x1CBE }, // Elgin
        { vendorId: 0x14ad }, // CTX
        { vendorId: 0x0FE6 }, // ICS Advent DBA Contour Design
      ];

      for (const device of devices) {
        const isKnownPrinter = printerFilters.some(
          filter => filter.vendorId === device.vendorId
        );

        const productName = device.productName?.toLowerCase() || '';
        const manufacturerName = device.manufacturerName?.toLowerCase() || '';
        const isPrinterByName =
          productName.includes('printer') ||
          productName.includes('pos') ||
          productName.includes('thermal') ||
          manufacturerName.includes('printer') ||
          manufacturerName.includes('pos');

        if (isKnownPrinter || isPrinterByName) {
          const displayName = device.productName ||
            device.manufacturerName ||
            `USB Printer (${device.vendorId.toString(16).toUpperCase()}:${device.productId.toString(16).toUpperCase()})`;

          printers.push({
            id: `usb_${device.vendorId}_${device.productId}`,
            name: displayName,
            type: 'usb',
            vendorId: device.vendorId,
            productId: device.productId,
            connected: device.opened
          });

          console.log(`✅ Impressora detectada: ${displayName}`);
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
      // Solicitar dispositivo com filtros completos
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0dd4 }, // Custom Engineering
          { vendorId: 0x0519 }, // Citizen
          { vendorId: 0x0fe6 }, // ICS Advent/Contour Design
          { vendorId: 0x154f }, // Rongta Technology
          { vendorId: 0x0483 }, // STMicroelectronics
          { vendorId: 0x1fc9 }, // NXP Semiconductors
          { vendorId: 0x0926 }, // Zjiang
          { vendorId: 0x6868 }, // Xprinter
          { vendorId: 0x1504 }, // Bixolon
          { vendorId: 0x0416 }, // Winbond Electronics
          { vendorId: 0x20d1 }, // Xiamen Hanin
          { vendorId: 0x0525 }, // Netchip Technology
          { vendorId: 0x1CBE }, // Elgin
          { vendorId: 0x14ad }, // CTX
        ]
      });

      // Abrir e configurar dispositivo
      if (!device.opened) {
        await device.open();
      }

      // Selecionar configuração (normalmente 1)
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Reivindicar interface (normalmente 0)
      await device.claimInterface(0);

      const printerId = `usb_${device.vendorId}_${device.productId}`;
      this.connectedDevices.set(printerId, device);
      this.reconnectAttempts.set(printerId, 0);

      const displayName = device.productName ||
        device.manufacturerName ||
        `USB Printer (${device.vendorId.toString(16).toUpperCase()}:${device.productId.toString(16).toUpperCase()})`;

      console.log(`✅ Impressora USB conectada: ${displayName}`);

      return {
        id: printerId,
        name: displayName,
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

      // Configuração padrão para impressoras térmicas seriais
      await port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

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
      throw new Error('Impressora USB não conectada. Conecte a impressora primeiro.');
    }

    try {
      // Verificar se o dispositivo está aberto
      if (!device.opened) {
        console.warn('⚠️ Dispositivo não está aberto, tentando abrir...');
        await device.open();
        if (device.configuration === null) {
          await device.selectConfiguration(1);
        }
        await device.claimInterface(0);
      }

      // Encontrar endpoint de saída
      const interface_ = device.configuration.interfaces[0];
      const endpoint = interface_.alternate.endpoints.find(
        (ep: any) => ep.direction === 'out' && ep.type === 'bulk'
      );

      if (!endpoint) {
        console.error('❌ Endpoints disponíveis:', interface_.alternate.endpoints);
        throw new Error('Endpoint de saída não encontrado. Verifique a impressora.');
      }

      console.log(`📤 Enviando ${data.length} bytes para endpoint ${endpoint.endpointNumber}`);

      // Enviar dados em chunks se for muito grande
      const chunkSize = endpoint.packetSize || 64;
      let offset = 0;

      while (offset < data.length) {
        const chunk = data.slice(offset, Math.min(offset + chunkSize, data.length));
        const result = await device.transferOut(endpoint.endpointNumber, chunk);

        if (result.status !== 'ok') {
          throw new Error(`Erro na transferência USB: ${result.status}`);
        }

        offset += chunk.length;
      }

      console.log('✅ Impressão USB enviada com sucesso');
    } catch (error: any) {
      console.error('❌ Erro na impressão USB:', error);

      // Tentar reconectar se o dispositivo foi desconectado
      if (error.message?.includes('disconnected') || error.message?.includes('device')) {
        this.connectedDevices.delete(deviceId);
        console.log('🔄 Tentando reconectar dispositivo...');
        await this.attemptReconnect(deviceId);
      }

      throw new Error(`Erro ao imprimir via USB: ${error.message}`);
    }
  }

  // Imprimir via Serial
  private async printSerial(deviceId: string, data: Uint8Array): Promise<void> {
    const port = this.connectedDevices.get(deviceId);
    if (!port) {
      throw new Error('Porta serial não conectada. Conecte a impressora primeiro.');
    }

    try {
      // Verificar se a porta está aberta
      if (!port.readable || !port.writable) {
        console.warn('⚠️ Porta não está aberta, tentando abrir...');
        await port.open({
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none'
        });
      }

      if (!port.writable) {
        throw new Error('Porta serial não está disponível para escrita');
      }

      console.log(`📤 Enviando ${data.length} bytes para porta serial`);

      const writer = port.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();

      console.log('✅ Impressão Serial enviada com sucesso');
    } catch (error: any) {
      console.error('❌ Erro na impressão Serial:', error);

      // Tentar reconectar se a porta foi desconectada
      if (error.message?.includes('disconnected') || error.message?.includes('port')) {
        this.connectedDevices.delete(deviceId);
        console.log('🔄 Tentando reconectar porta serial...');
        await this.attemptReconnect(deviceId);
      }

      throw new Error(`Erro ao imprimir via Serial: ${error.message}`);
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

  // Verificar status da impressora com reconexão automática
  async checkPrinterStatus(deviceId: string): Promise<'connected' | 'disconnected' | 'error'> {
    const device = this.connectedDevices.get(deviceId);

    if (!device) {
      const attempts = this.reconnectAttempts.get(deviceId) || 0;
      if (attempts < this.maxReconnectAttempts) {
        console.log(`🔄 Tentando reconectar impressora ${deviceId}...`);
        await this.attemptReconnect(deviceId);
      }
      return 'disconnected';
    }

    try {
      // Para USB, verificar se ainda está aberto
      if (device.opened !== undefined) {
        if (!device.opened) {
          console.warn(`⚠️ Impressora USB ${deviceId} não está aberta`);
          return 'disconnected';
        }
        return 'connected';
      }

      // Para Serial, verificar se readable está disponível
      if (device.readable !== undefined) {
        if (!device.readable) {
          console.warn(`⚠️ Porta serial ${deviceId} não está legível`);
          return 'disconnected';
        }
        return 'connected';
      }

      return 'connected';
    } catch (error) {
      console.error('Error checking printer status:', error);
      return 'error';
    }
  }

  // Tentar reconectar dispositivo
  private async attemptReconnect(deviceId: string): Promise<void> {
    try {
      const [type, vendorId, productId] = deviceId.split('_');

      if (type === 'usb' && this.isWebUSBSupported) {
        const devices = await (navigator as any).usb.getDevices();
        const device = devices.find(
          (d: any) => `usb_${d.vendorId}_${d.productId}` === deviceId
        );

        if (device && !device.opened) {
          await device.open();
          if (device.configuration === null) {
            await device.selectConfiguration(1);
          }
          await device.claimInterface(0);
          this.connectedDevices.set(deviceId, device);
          console.log(`✅ Impressora reconectada: ${deviceId}`);
        }
      } else if (type === 'serial' && this.isWebSerialSupported) {
        const ports = await (navigator as any).serial.getPorts();
        const port = ports.find((p: any) => {
          const info = p.getInfo();
          return `serial_${info.usbVendorId || 'unknown'}_${info.usbProductId || 'unknown'}` === deviceId;
        });

        if (port && !port.readable) {
          await port.open({
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none'
          });
          this.connectedDevices.set(deviceId, port);
          console.log(`✅ Porta serial reconectada: ${deviceId}`);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao reconectar ${deviceId}:`, error);
      const attempts = this.reconnectAttempts.get(deviceId) || 0;
      this.reconnectAttempts.set(deviceId, attempts + 1);
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