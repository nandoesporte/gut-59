import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { transferSchema, type TransferFormValues } from './schemas/transfer-schema';
import { useWallet } from '@/hooks/useWallet';
import { TransferFormFields } from './components/TransferFormFields';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TransactionReceipt } from './components/TransactionReceipt';
import { Transaction } from '@/types/wallet';
import { AlertCircle } from "lucide-react";

export function TransferForm() {
  const { wallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipientEmail: '',
      amount: 0,
      description: ''
    }
  });

  useEffect(() => {
    const amount = form.watch('amount');
    if (wallet && amount > wallet.balance) {
      setInsufficientFunds(true);
    } else {
      setInsufficientFunds(false);
    }
  }, [form.watch('amount'), wallet]);

  useEffect(() => {
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

    if (values.amount > wallet.balance) {
      toast.error('Saldo insuficiente para realizar a transferência');
      setInsufficientFunds(true);
      return;
    }

    try {
      setIsLoading(true);

      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', values.recipientEmail)
        .maybeSingle();

      if (profileError || !recipientProfile) {
        toast.error('Destinatário não encontrado');
        return;
      }

      if (recipientProfile.id === wallet.user_id) {
        toast.error('Você não pode transferir FITs para você mesmo');
        return;
      }

      const { data: transferResult, error } = await (supabase.rpc as any)('process_transfer', {
        _qr_code_id: recipientProfile.id
      });

      if (error) {
        if (error.message.includes('Saldo insuficiente')) {
          toast.error('Saldo insuficiente para realizar a transferência');
          setInsufficientFunds(true);
        } else {
          toast.error('Erro ao realizar transferência. Tente novamente.');
        }
        console.error('Transfer error:', error);
        return;
      }

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
      setInsufficientFunds(false);
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
          
          {insufficientFunds && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Saldo insuficiente. Seu saldo atual é de {wallet?.balance || 0} FITs.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || insufficientFunds}
          >
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
