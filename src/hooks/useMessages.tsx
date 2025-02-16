
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  type: 'nutricionista' | 'personal';
  profiles: {
    name: string | null;
    photo_url: string | null;
  } | null;
}

export const useMessages = (adminId: string | null, isAdmin: boolean, type: 'nutricionista' | 'personal' = 'nutricionista') => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useEffect(() => {
    if (adminId) {
      fetchMessages();
      
      // Inscreva-se para atualizações em tempo real
      const channel = supabase
        .channel('messages_channel')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `type=eq.${type}`
        }, async (payload) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Verifique se a mensagem é relevante para este usuário
          if (isAdmin) {
            if (payload.new.receiver_id === user.id || payload.new.type === type) {
              setHasNewMessage(true);
              fetchMessages();
            }
          } else {
            if (payload.new.sender_id === user.id || payload.new.receiver_id === user.id) {
              setHasNewMessage(true);
              fetchMessages();
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [adminId, isAdmin, type]);

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !adminId) return;

      let query = supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          type,
          profiles!messages_sender_id_fkey (
            name,
            photo_url
          )
        `)
        .eq('type', type);

      // Se for admin, veja todas as mensagens do tipo específico
      // Se for usuário regular, veja apenas suas mensagens com o admin
      if (!isAdmin) {
        query = query.or(`and(sender_id.eq.${user.id},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${user.id})`);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      
      console.log('Fetched messages:', data);
      setMessages(data || []);
      setHasNewMessage(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Erro ao carregar mensagens",
        description: "Não foi possível carregar as mensagens.",
        variant: "destructive",
      });
    }
  };

  return { messages, hasNewMessage, fetchMessages };
};
