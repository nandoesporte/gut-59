
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { AIAgentPrompt, AgentType } from "./types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AgentPromptFormProps {
  type: AgentType;
  prompt?: AIAgentPrompt;
  onSuccess: () => void;
}

type FormData = {
  agent_type: AgentType;
  name: string;
  description: string | null;
  prompt: string;
  is_active: boolean;
};

export const AgentPromptForm = ({ type, prompt, onSuccess }: AgentPromptFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<FormData>({
    defaultValues: {
      agent_type: type,
      name: prompt?.name || '',
      description: prompt?.description || '',
      prompt: prompt?.prompt || '',
      is_active: prompt?.is_active ?? true,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      
      if (prompt?.id) {
        const { error } = await supabase
          .from('ai_agent_prompts')
          .update(data)
          .eq('id', prompt.id);
          
        if (error) throw error;
        toast.success('Prompt atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('ai_agent_prompts')
          .insert(data);
          
        if (error) throw error;
        toast.success('Prompt criado com sucesso');
      }
      
      onSuccess();
      form.reset();
    } catch (error) {
      console.error('Erro ao salvar prompt:', error);
      toast.error('Erro ao salvar prompt');
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
                <Input {...field} placeholder="Nome do prompt" />
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
                <Textarea {...field} placeholder="Descrição do prompt" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prompt</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Digite o prompt para o agente de IA"
                  className="min-h-[200px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between">
              <FormLabel>Ativo</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : prompt ? 'Atualizar' : 'Criar'}
        </Button>
      </form>
    </Form>
  );
};
