
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { MessageList } from "./MessageList";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  profiles: {
    name: string | null;
    photo_url: string | null;
  } | null;
}

interface UserConversationProps {
  messages: Message[];
  selectedUserId: string | null;
  onMessageSent: () => void;
}

export const UserConversation = ({ 
  messages, 
  selectedUserId,
  onMessageSent 
}: UserConversationProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          receiver_id: selectedUserId,
        });

      if (error) throw error;

      setNewMessage("");
      onMessageSent();
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar sua mensagem.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!selectedUserId) {
    return (
      <div className="flex items-center justify-center h-[600px] text-gray-500">
        Selecione um usuário para iniciar uma conversa
      </div>
    );
  }

  return (
    <Card className="p-4 h-[600px] flex flex-col">
      <MessageList messages={messages} selectedUserId={selectedUserId} />
      <div className="flex gap-2 mt-4">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Digite sua mensagem..."
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <Button
          onClick={sendMessage}
          disabled={loading || !newMessage.trim()}
        >
          <Send className="w-4 h-4 mr-2" />
          Enviar
        </Button>
      </div>
    </Card>
  );
};
