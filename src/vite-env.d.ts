
/// <reference types="vite/client" />

declare module '@mercadopago/sdk-react' {
  export function initMercadoPago(publicKey: string, options?: { locale: string }): void;
  export function Wallet(props: { 
    initialization: { preferenceId: string },
    customization?: { 
      texts?: { 
        action?: string,
        valueProp?: string 
      } 
    }
  }): JSX.Element;
}

// Add type definitions for the Accelerometer API
interface AccelerometerReading {
  x: number;
  y: number;
  z: number;
}

interface AccelerometerOptions {
  frequency?: number;
}

declare global {
  interface Accelerometer extends EventTarget {
    x: number;
    y: number;
    z: number;
    timestamp: number;
    start(): void;
    stop(): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  }

  var Accelerometer: {
    prototype: Accelerometer;
    new(options?: AccelerometerOptions): Accelerometer;
  };
}
