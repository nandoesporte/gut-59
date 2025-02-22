
declare module '@mercadopago/sdk-react' {
  export function initMercadoPago(publicKey: string, options?: { locale: string }): void;
  
  export interface WalletProps {
    initialization: {
      preferenceId: string;
    };
    customization?: {
      texts?: {
        valueProp?: string;
      };
    };
  }
  
  export const Wallet: React.FC<WalletProps>;
}
