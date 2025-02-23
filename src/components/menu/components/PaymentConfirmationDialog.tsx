
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type PaymentConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
};

export const PaymentConfirmationDialog: React.FC<PaymentConfirmationDialogProps> = ({
  open,
  onOpenChange,
  message,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagamento Confirmado!</DialogTitle>
          <DialogDescription>
            <p className="mt-2">
              {message}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Você pode prosseguir com a geração do seu plano.
            </p>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
