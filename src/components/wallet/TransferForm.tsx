
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { transferSchema, type TransferFormValues } from './schemas/transfer-schema';
import { useWallet } from '@/hooks/useWallet';
import { TransferFormFields } from './components/TransferFormFields';
import { toast } from 'sonner';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function TransferForm() {
  const { addTransaction, wallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  
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

    try {
      setIsLoading(true);

      // Primeiro, buscar o ID do usuário destinatário pelo email
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', values.recipientEmail)
        .maybeSingle();

      if (profileError || !recipientProfile) {
        toast.error('Destinatário não encontrado');
        return;
      }

      // Verificar se o usuário está tentando transferir para ele mesmo
      if (recipientProfile.id === wallet.user_id) {
        toast.error('Você não pode transferir FITs para você mesmo');
        return;
      }

      // Agora sim, fazer a transferência usando o ID do usuário
      await addTransaction({
        amount: -values.amount, // Valor negativo para transferência de saída
        type: 'transfer',
        description: values.description || 'Transferência de FITs',
        recipientId: recipientProfile.id // Agora usando o UUID correto
      });

      toast.success('Transferência realizada com sucesso!');
      form.reset();
    } catch (error) {
      toast.error('Erro ao realizar transferência. Tente novamente.');
      console.error('Transfer error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
