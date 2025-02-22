
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

