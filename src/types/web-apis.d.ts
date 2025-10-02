// Definições de tipos para Web APIs

interface USBDevice {
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  opened: boolean;
  configuration: {
    configurationValue: number;
    interfaces: Array<{
      interfaceNumber: number;
      alternate: {
        interfaceClass: number;
        interfaceSubclass: number;
        interfaceProtocol: number;
        endpoints: Array<{
          direction: 'in' | 'out';
          endpointNumber: number;
          type: 'bulk' | 'interrupt' | 'isochronous';
          packetSize: number;
        }>;
      };
    }>;
  };
  configurations: Array<{
    configurationValue: number;
    interfaces: Array<any>;
  }>;
  open(): Promise<void>;
  close(): Promise<void>;
  reset(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>;
  controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult>;
}

interface USBInTransferResult {
  data: DataView;
  status: 'ok' | 'stall' | 'babble';
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall' | 'babble';
}

interface USBControlTransferParameters {
  requestType: 'standard' | 'class' | 'vendor';
  recipient: 'device' | 'interface' | 'endpoint' | 'other';
  request: number;
  value: number;
  index: number;
}

interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}

interface USB {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options?: { filters?: USBDeviceFilter[] }): Promise<USBDevice>;
  addEventListener(type: 'connect' | 'disconnect', listener: (event: USBConnectionEvent) => void): void;
  removeEventListener(type: 'connect' | 'disconnect', listener: (event: USBConnectionEvent) => void): void;
}

interface USBConnectionEvent extends Event {
  device: USBDevice;
}

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialPort {
  readable: ReadableStream | null;
  writable: WritableStream | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  forget(): Promise<void>;
  getInfo(): SerialPortInfo;
  getSignals(): Promise<SerialInputSignals>;
  setSignals(signals: SerialOutputSignals): Promise<void>;
  addEventListener(type: 'connect' | 'disconnect', listener: (event: Event) => void): void;
  removeEventListener(type: 'connect' | 'disconnect', listener: (event: Event) => void): void;
}

interface SerialInputSignals {
  dataCarrierDetect: boolean;
  clearToSend: boolean;
  ringIndicator: boolean;
  dataSetReady: boolean;
}

interface SerialOutputSignals {
  dataTerminalReady?: boolean;
  requestToSend?: boolean;
  break?: boolean;
}

interface SerialPortRequestOptions {
  filters?: Array<{
    usbVendorId?: number;
    usbProductId?: number;
  }>;
}

interface Serial {
  getPorts(): Promise<SerialPort[]>;
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  addEventListener(type: 'connect' | 'disconnect', listener: (event: SerialConnectionEvent) => void): void;
  removeEventListener(type: 'connect' | 'disconnect', listener: (event: SerialConnectionEvent) => void): void;
}

interface SerialConnectionEvent extends Event {
  port: SerialPort;
}

declare global {
  interface Navigator {
    usb: USB;
    serial: Serial;
  }
}

export {};