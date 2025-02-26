
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { transferSchema, type TransferFormValues } from './schemas/transfer-schema';
import { useWallet } from '@/hooks/useWallet';
import { TransferFormFields } from './components/TransferFormFields';
import { toast } from 'sonner';

export function TransferForm() {
  const { addTransaction, wallet } = useWallet();
  
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipientEmail: '',
      amount: 0,
      description: ''
    }
  });

  const handleTransfer = async (values: TransferFormValues) => {
    if (!wallet) {
      toast.error('Carteira não encontrada');
      return;
    }

    addTransaction({
      amount: -values.amount, // Negative amount for outgoing transfer
      type: 'transfer',
      description: values.description || 'Transferência de FITs',
      recipientId: values.recipientEmail // This will be resolved in the mutation
    });

    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleTransfer)} className="space-y-4">
        <TransferFormFields form={form} />
        <Button type="submit" className="w-full">
          Enviar FITs
        </Button>
      </form>
    </Form>
  );
}
