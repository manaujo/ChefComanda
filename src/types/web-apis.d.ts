// Definições de tipos para Web APIs

interface USBDevice {
  vendorId: number;
  productId: number;
  productName?: string;
  opened: boolean;
  configuration: {
    interfaces: Array<{
      alternate: {
        endpoints: Array<{
          direction: 'in' | 'out';
          endpointNumber: number;
        }>;
      };
    }>;
  };
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall' | 'babble';
}

interface USB {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options: { filters: Array<{ vendorId: number }> }): Promise<USBDevice>;
}

interface SerialPort {
  readable: ReadableStream | null;
  writable: WritableStream | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): {
    usbVendorId?: number;
    usbProductId?: number;
  };
}

interface Serial {
  getPorts(): Promise<SerialPort[]>;
  requestPort(): Promise<SerialPort>;
}

declare global {
  interface Navigator {
    usb: USB;
    serial: Serial;
  }
}

export {};