
import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';

const transferSchema = z.object({
  recipientEmail: z.string()
    .email('Digite um email válido'),
  amount: z.number()
    .min(1, 'O valor mínimo é 1 FIT')
    .max(1000000, 'Valor máximo excedido'),
  description: z.string().optional()
});

type TransferFormValues = z.infer<typeof transferSchema>;

export function TransferForm() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipientEmail: '',
      amount: 0,
      description: ''
    }
  });

  const onSubmit = async (values: TransferFormValues) => {
    try {
      setIsLoading(true);
      console.log('Starting transfer process with values:', values);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Auth error:', userError);
        toast.error('Erro de autenticação');
        return;
      }
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }
      console.log('Current user:', user.id);

      // Get the sender's wallet
      const { data: senderWallet, error: senderWalletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Sender wallet query result:', { senderWallet, senderWalletError });

      if (senderWalletError) {
        console.error('Sender wallet error:', senderWalletError);
        toast.error('Erro ao acessar sua carteira');
        return;
      }

      if (!senderWallet) {
        toast.error('Você ainda não possui uma carteira');
        return;
      }

      // Verify if sender has enough balance
      if (senderWallet.balance < values.amount) {
        console.log('Insufficient balance:', { balance: senderWallet.balance, requested: values.amount });
        toast.error('Saldo insuficiente para realizar a transferência');
        return;
      }

      // First get the recipient's profile by email
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', values.recipientEmail)
        .maybeSingle();

      console.log('Recipient profile query result:', { recipientProfile, profileError });

      if (profileError) {
        console.error('Profile error:', profileError);
        toast.error('Erro ao buscar destinatário');
        return;
      }

      if (!recipientProfile) {
        toast.error('Destinatário não encontrado');
        return;
      }

      // Prevent self-transfer
      if (recipientProfile.id === user.id) {
        toast.error('Você não pode transferir FITs para você mesmo');
        return;
      }

      // Get the recipient's wallet
      const { data: recipientWallet, error: recipientWalletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', recipientProfile.id)
        .maybeSingle();

      console.log('Recipient wallet query result:', { recipientWallet, recipientWalletError });

      if (recipientWalletError) {
        console.error('Recipient wallet error:', recipientWalletError);
        toast.error('Erro ao acessar carteira do destinatário');
        return;
      }

      if (!recipientWallet) {
        toast.error('O destinatário ainda não possui uma carteira');
        return;
      }

      const transferParams = {
        sender_wallet_id: senderWallet.id,
        recipient_wallet_id: recipientWallet.id,
        transfer_amount: values.amount,
        description: values.description || 'Transferência de FITs'
      };
      
      console.log('Calling process_transfer with params:', transferParams);

      // Process the transfer using the RPC function
      const { data: transferData, error: transferError } = await supabase.rpc(
        'process_transfer',
        transferParams
      );

      console.log('Transfer result:', { transferData, transferError });

      if (transferError) {
        console.error('Transfer error:', transferError);
        if (transferError.message.includes('not enough balance')) {
          toast.error('Saldo insuficiente para realizar a transferência');
        } else {
          toast.error('Erro ao realizar transferência');
        }
        return;
      }

      form.reset();
      toast.success('Transferência realizada com sucesso!');
    } catch (error) {
      console.error('Error during transfer:', error);
      toast.error('Erro ao realizar transferência');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="recipientEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email do Destinatário</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="email@exemplo.com" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade de FITs</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="0" 
                  {...field}
                  onChange={e => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Motivo da transferência" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Processando...' : 'Enviar FITs'}
        </Button>
      </form>
    </Form>
  );
}
