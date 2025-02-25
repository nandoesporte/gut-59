
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
  recipientIdentifier: z.string()
    .min(11, 'Digite um CPF ou telefone válido')
    .max(14, 'Digite um CPF ou telefone válido'),
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
      recipientIdentifier: '',
      amount: 0,
      description: ''
    }
  });

  const onSubmit = async (values: TransferFormValues) => {
    try {
      setIsLoading(true);

      // First, verify if the recipient exists by CPF or phone number
      const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone_number.eq.${values.recipientIdentifier},cpf.eq.${values.recipientIdentifier}`)
        .maybeSingle();

      if (recipientError || !recipient) {
        toast.error('Destinatário não encontrado');
        return;
      }

      // Get current user's wallet
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
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
          name="recipientIdentifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF ou Telefone do Destinatário</FormLabel>
              <FormControl>
                <Input placeholder="000.000.000-00 ou (00) 00000-0000" {...field} />
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
