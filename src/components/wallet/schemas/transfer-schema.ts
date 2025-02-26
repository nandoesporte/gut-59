
import { z } from 'zod';

export const transferSchema = z.object({
  recipientEmail: z.string()
    .email('Digite um email válido'),
  amount: z.number()
    .min(1, 'O valor mínimo é 1 FIT')
    .max(1000000, 'Valor máximo excedido'),
  description: z.string().optional()
});

export type TransferFormValues = z.infer<typeof transferSchema>;
