
import React from 'react';
import { CheckCircle } from "lucide-react";
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
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900">
        <DialogHeader className="flex flex-col items-center text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4 animate-fade-in" />
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Pagamento Confirmado!
          </DialogTitle>
          <DialogDescription>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              {message}
            </p>
            <p className="mt-4 text-sm text-green-600 dark:text-green-400 font-medium">
              Você tem direito a gerar seu plano até 3 vezes!
            </p>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
