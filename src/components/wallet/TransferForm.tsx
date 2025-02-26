
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { transferSchema, type TransferFormValues } from './schemas/transfer-schema';
import { useWallet } from '@/hooks/useWallet';
import { TransferFormFields } from './components/TransferFormFields';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TransactionReceipt } from './components/TransactionReceipt';
import { Transaction } from '@/types/wallet';

export function TransferForm() {
  const { wallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipientEmail: '',
      amount: 0,
      description: ''
    }
  });

  useEffect(() => {
    // Inscrever-se para atualizações em tempo real das transações
    const channel = supabase
      .channel('wallet-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fit_transactions',
          filter: wallet ? `wallet_id=eq.${wallet.id}` : undefined
        },
        () => {
          // Recarregar os dados da carteira quando houver uma nova transação
          window.location.reload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallet]);

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
        .select('id, email')
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

      // Usar a função process_transfer do banco de dados
      const { data: transferResult, error } = await supabase.rpc('process_transfer', {
        sender_wallet_id: wallet.user_id,
        recipient_wallet_id: recipientProfile.id,
        transfer_amount: values.amount,
        description: values.description || 'Transferência de FITs'
      });

      if (error) {
        if (error.message.includes('Saldo insuficiente')) {
          toast.error('Saldo insuficiente para realizar a transferência');
        } else {
          toast.error('Erro ao realizar transferência. Tente novamente.');
        }
        console.error('Transfer error:', error);
        return;
      }

      // Buscar a transação recém-criada
      const { data: newTransaction } = await supabase
        .from('fit_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (newTransaction) {
        setLastTransaction(newTransaction as Transaction);
        setRecipientEmail(values.recipientEmail);
        setShowReceipt(true);
      }

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
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleTransfer)} className="space-y-4">
          <TransferFormFields form={form} />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Processando...' : 'Enviar FITs'}
          </Button>
        </form>
      </Form>

      {lastTransaction && (
        <TransactionReceipt
          transaction={lastTransaction}
          recipientEmail={recipientEmail}
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  );
}
