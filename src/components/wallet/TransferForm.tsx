
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // First get the recipient's profile by email
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', values.recipientEmail)
        .single();

      if (profileError || !recipientProfile) {
        toast.error('Destinatário não encontrado');
        return;
      }

      // Then get the recipient's wallet
      const { data: recipientWallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, user_id')
        .eq('user_id', recipientProfile.id)
        .single();

      if (walletError || !recipientWallet) {
        toast.error('Carteira do destinatário não encontrada');
        return;
      }

      // Prevent self-transfer
      if (recipientWallet.user_id === user.id) {
        toast.error('Você não pode transferir FITs para você mesmo');
        return;
      }

      // Process the transfer using the RPC function
      const { error: transferError } = await supabase.rpc('process_transfer', {
        sender_wallet_id: user.id,
        recipient_wallet_id: recipientWallet.user_id,
        transfer_amount: values.amount,
        description: values.description || 'Transferência de FITs'
      });

      if (transferError) {
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
