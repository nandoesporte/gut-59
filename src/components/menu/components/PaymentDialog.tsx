
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayment: () => Promise<void>;
  isProcessing: boolean;
  currentPrice?: number;
}

export const PaymentDialog = ({
  open,
  onOpenChange,
  onPayment,
  isProcessing,
  currentPrice = 19.90
}: PaymentDialogProps) => {
  const displayPrice = currentPrice?.toFixed(2) || "19.90";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagamento do Plano Alimentar</DialogTitle>
          <DialogDescription>
            Para gerar seu plano alimentar personalizado, é necessário realizar o pagamento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Valor: R$ {displayPrice}
          </p>
          <Button 
            onClick={onPayment} 
            className="w-full"
            disabled={isProcessing}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {isProcessing ? "Processando..." : "Realizar Pagamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
