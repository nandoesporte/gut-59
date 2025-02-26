
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { transferSchema, type TransferFormValues } from './schemas/transfer-schema';
import { useTransferSubmit } from './hooks/useTransferSubmit';
import { TransferFormFields } from './components/TransferFormFields';

export function TransferForm() {
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipientEmail: '',
      amount: 0,
      description: ''
    }
  });

  const { isLoading, handleTransfer } = useTransferSubmit(form.reset);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleTransfer)} className="space-y-4">
        <TransferFormFields form={form} />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Processando...' : 'Enviar FITs'}
        </Button>
      </form>
    </Form>
  );
}
