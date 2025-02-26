
import { Transaction } from "@/types/wallet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import html2canvas from "html2canvas";

type TransactionReceiptProps = {
  transaction: Transaction;
  recipientEmail?: string;
  open: boolean;
  onClose: () => void;
};

export function TransactionReceipt({ transaction, recipientEmail, open, onClose }: TransactionReceiptProps) {
  const handleShare = async () => {
    const receiptElement = document.getElementById('transaction-receipt');
    if (!receiptElement) return;

    try {
      const canvas = await html2canvas(receiptElement, {
        backgroundColor: '#ffffff',
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      if (navigator.share) {
        const file = new File([blob], 'comprovante.png', { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: 'Comprovante de Transferência',
        });
      } else {
        // Fallback para download se Web Share API não estiver disponível
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'comprovante.png';
        link.click();
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Comprovante de Transferência</DialogTitle>
        </DialogHeader>
        <div 
          id="transaction-receipt" 
          className="bg-white p-6 rounded-lg space-y-4"
        >
          <div className="flex justify-center mb-4">
            <img 
              src="/lovable-uploads/9456a3bf-9bc8-45d6-9105-dd939e3362f5.png" 
              alt="Logo" 
              className="h-12"
            />
          </div>
          <div className="border-t border-b py-4 space-y-2">
            <p className="text-sm text-gray-600">
              Data: {format(new Date(transaction.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-sm text-gray-600">
              Tipo: Transferência de FITs
            </p>
            <p className="text-sm text-gray-600">
              Valor: {Math.abs(transaction.amount)} FITs
            </p>
            {recipientEmail && (
              <p className="text-sm text-gray-600">
                Destinatário: {recipientEmail}
              </p>
            )}
            {transaction.description && (
              <p className="text-sm text-gray-600">
                Descrição: {transaction.description}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">
            ID da transação: {transaction.id}
          </p>
        </div>
        <Button onClick={handleShare} className="w-full mt-4">
          <Share2 className="w-4 h-4 mr-2" />
          Compartilhar Comprovante
        </Button>
      </DialogContent>
    </Dialog>
  );
}
