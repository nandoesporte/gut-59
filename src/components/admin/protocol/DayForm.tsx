
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
import { Textarea } from "@/components/ui/textarea";
import { ProtocolPhase, DayFormValues } from "../types";

const dayFormSchema = z.object({
  phase_id: z.coerce.number().min(1, "Fase é obrigatória"),
  day: z.coerce.number().min(1, "Dia é obrigatório"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  content: z.string().min(1, "Conteúdo é obrigatório"),
});

interface DayFormProps {
  onSubmit: (data: DayFormValues) => void;
  defaultValues?: DayFormValues;
  submitLabel: string;
  phases?: ProtocolPhase[];
}

export const DayForm = ({ onSubmit, defaultValues, submitLabel, phases }: DayFormProps) => {
  const form = useForm<DayFormValues>({
    resolver: zodResolver(dayFormSchema),
    defaultValues: defaultValues || {
      phase_id: 1,
      day: 1,
      title: "",
      description: "",
      content: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="phase_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fase</FormLabel>
              <FormControl>
                <select
                  className="w-full p-2 border rounded"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                >
                  <option value="">Selecione uma fase</option>
                  {phases?.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="day"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dia</FormLabel>
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
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
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteúdo</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-[200px]"
                  {...field}
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

