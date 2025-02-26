import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { Message } from "@/types/messages";

export const useMessages = (adminId: string | null, isAdmin: boolean, type: 'nutricionista' | 'personal' = 'nutricionista') => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const navigate = useNavigate();

  const fetchMessages = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

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
          read,
          profiles!messages_sender_id_fkey (
            name,
            photo_url
          )
        `)
        .eq('type', type);

      if (!isAdmin) {
        query = query.or(`and(sender_id.eq.${user.id},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${user.id})`);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      
      const lastViewedTimestamp = localStorage.getItem(`last_viewed_${type}`);
      const hasUnread = data?.some(message => 
        message.sender_id === adminId && 
        message.created_at > (lastViewedTimestamp || '0') &&
        !message.read
      );

      setHasNewMessage(hasUnread);
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      if ((error as any)?.status === 403) {
        navigate('/auth');
      } else {
        toast({
          title: "Erro ao carregar mensagens",
          description: "Não foi possível carregar as mensagens.",
          variant: "destructive",
        });
      }
    }
  }, [adminId, isAdmin, type, navigate]);

  const markMessagesAsRead = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !adminId) return;

      const currentTimestamp = new Date().toISOString();
      localStorage.setItem(`last_viewed_${type}`, currentTimestamp);

      const unreadMessages = messages.filter(message => 
        message.sender_id === adminId && !message.read
      );

      if (unreadMessages.length > 0) {
        const { error } = await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadMessages.map(m => m.id));

        if (error) throw error;
        setHasNewMessage(false);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      if ((error as any)?.status === 403) {
        navigate('/auth');
      }
    }
  }, [messages, adminId, type, navigate]);

  useEffect(() => {
    if (adminId) {
      fetchMessages();
      
      // Configurar o canal para atualizações em tempo real
      const channel = supabase
        .channel('messages_channel')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `type=eq.${type}`
        }, async (payload) => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            navigate('/auth');
            return;
          }

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          if (isAdmin) {
            if (payload.new.receiver_id === user.id || payload.new.type === type) {
              setHasNewMessage(true);
              fetchMessages();
            }
          } else {
            if (payload.new.sender_id === adminId || payload.new.receiver_id === user.id) {
              setHasNewMessage(true);
              fetchMessages();
              
              // Reproduzir um som de notificação (opcional)
              const audio = new Audio('/notification.mp3');
              audio.play().catch(() => {}); // Ignora erro se o usuário não interagiu com a página
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [adminId, isAdmin, type, fetchMessages, navigate]);

  return { messages, hasNewMessage, fetchMessages, markMessagesAsRead };
};
