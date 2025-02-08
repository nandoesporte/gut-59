
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TrainingModule, TrainingModuleFormValues } from "../types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  display_order: z.number().min(1, "Ordem é obrigatória"),
  status: z.enum(["active", "inactive"]),
});

interface ModuleFormProps {
  module?: TrainingModule | null;
  onSuccess?: () => void;
}

export const ModuleForm = ({ module, onSuccess }: ModuleFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TrainingModuleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: module?.name || "",
      description: module?.description || "",
      display_order: module?.display_order || 1,
      status: module?.status || "active",
    },
  });

  const onSubmit = async (values: TrainingModuleFormValues) => {
    setIsLoading(true);
    try {
      if (module) {
        const { error } = await supabase
          .from("training_modules")
          .update(values)
          .eq("id", module.id);
        if (error) throw error;
        toast.success("Módulo atualizado com sucesso");
      } else {
        const { error } = await supabase.from("training_modules").insert(values);
        if (error) throw error;
        toast.success("Módulo criado com sucesso");
      }
      onSuccess?.();
      form.reset();
    } catch (error) {
      console.error("Error saving module:", error);
      toast.error("Erro ao salvar módulo");
    } finally {
      setIsLoading(false);
    }
  };

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
                <Input {...field} />
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
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="display_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ordem de exibição</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : module ? "Atualizar" : "Criar"}
        </Button>
      </form>
    </Form>
  );
};
