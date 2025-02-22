
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wallet } from "@mercadopago/sdk-react";

interface PaymentSectionProps {
  isProcessing: boolean;
  preferenceId: string | null;
  onPayment: () => void;
}

export const PaymentSection = ({ isProcessing, preferenceId, onPayment }: PaymentSectionProps) => (
  <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
    <div className="text-center space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">
        Desbloqueie seu Plano Alimentar Personalizado
      </h3>
      <p className="text-gray-600">
        Por apenas R$ 19,90, tenha acesso ao seu plano alimentar personalizado com base nas suas preferências.
      </p>
      {preferenceId ? (
        <div className="w-full flex justify-center">
          <Wallet 
            initialization={{ preferenceId }}
            customization={{ texts: { valueProp: 'Pagamento Seguro' } }}
          />
        </div>
      ) : (
        <Button
          onClick={onPayment}
          disabled={isProcessing}
          className="w-full max-w-md bg-green-500 hover:bg-green-600"
        >
          {isProcessing ? 
            "Processando..." : 
            "Pagar R$ 19,90 e Continuar"
          }
        </Button>
      )}
    </div>
  </Card>
);
