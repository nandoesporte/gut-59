
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  TrainingModule,
  TrainingVideo,
  TrainingVideoFormValues,
} from "../types";
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
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  module_id: z.string().min(1, "Módulo é obrigatório"),
  url: z.string().url("URL inválida"),
  status: z.enum(["active", "inactive"]),
});

interface VideoFormProps {
  video?: TrainingVideo | null;
  modules: TrainingModule[];
  onSuccess?: () => void;
}

export const VideoForm = ({ video, modules, onSuccess }: VideoFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TrainingVideoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: video?.title || "",
      description: video?.description || "",
      module_id: video?.module_id || "",
      url: video?.url || "",
      status: video?.status || "active",
    },
  });

  const onSubmit = async (values: TrainingVideoFormValues) => {
    setIsLoading(true);
    try {
      if (video) {
        const { error } = await supabase
          .from("training_videos")
          .update(values)
          .eq("id", video.id);
        if (error) throw error;
        toast.success("Vídeo atualizado com sucesso");
      } else {
        const { error } = await supabase.from("training_videos").insert(values);
        if (error) throw error;
        toast.success("Vídeo criado com sucesso");
      }
      onSuccess?.();
      form.reset();
    } catch (error) {
      console.error("Error saving video:", error);
      toast.error("Erro ao salvar vídeo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
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
          name="module_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Módulo</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o módulo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do Vídeo</FormLabel>
              <FormControl>
                <Input {...field} />
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
          {isLoading ? "Salvando..." : video ? "Atualizar" : "Criar"}
        </Button>
      </form>
    </Form>
  );
};
