
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { PhaseFormValues } from "../types";

const phaseFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  day_start: z.coerce.number().min(1, "Dia inicial é obrigatório"),
  day_end: z.coerce.number().min(1, "Dia final é obrigatório"),
});

interface PhaseFormProps {
  onSubmit: (data: PhaseFormValues) => void;
  defaultValues?: PhaseFormValues;
  submitLabel: string;
}

export const PhaseForm = ({ onSubmit, defaultValues, submitLabel }: PhaseFormProps) => {
  const form = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseFormSchema),
    defaultValues: defaultValues || {
      name: "",
      description: "",
      day_start: 1,
      day_end: 1,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <input {...field} className="w-full p-2 border rounded" />
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
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <input {...field} className="w-full p-2 border rounded" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="day_start"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dia Inicial</FormLabel>
              <FormControl>
                <input
                  type="number"
                  {...field}
                  className="w-full p-2 border rounded"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="day_end"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dia Final</FormLabel>
              <FormControl>
                <input
                  type="number"
                  {...field}
                  className="w-full p-2 border rounded"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">{submitLabel}</Button>
      </form>
    </Form>
  );
};

