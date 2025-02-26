
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessageInputProps {
  selectedUserId: string;
  onMessageSent: () => void;
  role: "nutritionist" | "personal";
}

interface FormData {
  content: string;
}

export const MessageInput = ({ selectedUserId, onMessageSent, role }: MessageInputProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const messageType = role === "nutritionist" ? "nutricionista" : "personal";
      
      const { error } = await supabase.from("messages").insert({
        content: data.content,
        sender_id: userData.user.id,
        receiver_id: selectedUserId,
        type: messageType,
      });

      if (error) throw error;

      reset();
      onMessageSent();
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
      <Textarea
        {...register("content", { required: true })}
        placeholder="Digite sua mensagem..."
        className="flex-1"
        rows={1}
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Enviando..." : "Enviar"}
      </Button>
    </form>
  );
};
