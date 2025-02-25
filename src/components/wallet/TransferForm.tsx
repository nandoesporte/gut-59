
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

      // Get current user's wallet
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // First, verify if the recipient exists by email
      const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', (await supabase.auth.getUser(values.recipientEmail)).data.user?.id)
        .maybeSingle();

      if (recipientError || !recipient) {
        toast.error('Destinatário não encontrado');
        return;
      }

      // Prevent self-transfer
      if (recipient.id === user.id) {
        toast.error('Você não pode transferir FITs para você mesmo');
        return;
      }

      // Create a fit transaction
      const { error: transactionError } = await supabase
        .from('fit_transactions')
        .insert({
          wallet_id: user.id,
          amount: -values.amount,
          transaction_type: 'transfer',
          recipient_id: recipient.id,
          description: values.description || 'Transferência de FITs'
        });

      if (transactionError) {
        throw transactionError;
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
