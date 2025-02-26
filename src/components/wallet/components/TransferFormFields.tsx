
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import type { TransferFormValues } from "../schemas/transfer-schema";

type TransferFormFieldsProps = {
  form: UseFormReturn<TransferFormValues>;
};

export function TransferFormFields({ form }: TransferFormFieldsProps) {
  return (
    <>
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
    </>
  );
}
