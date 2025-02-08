
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserList } from "./messages/UserList";
import { UserConversation } from "./messages/UserConversation";

interface User {
  id: string;
  name: string | null;
  photo_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  profiles: {
    name: string | null;
    photo_url: string | null;
  } | null;
}

export const MessagesTab = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    fetchUsers();
    
    const channel = supabase
      .channel('messages_admin')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, () => {
        if (selectedUser) {
          fetchMessages(selectedUser);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, photo_url')
        .neq('id', user.id);

      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          read,
          profiles!messages_sender_id_fkey (
            name,
            photo_url
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Erro ao carregar mensagens",
        description: "Não foi possível carregar as mensagens.",
        variant: "destructive",
      });
    }
  };

  const handleUserSelect = async (userId: string) => {
    setSelectedUser(userId);
    await fetchMessages(userId);
  };

  return (
    <Card className="p-6">
      <div className="flex gap-4 h-[600px]">
        <UserList
          users={users}
          selectedUser={selectedUser}
          onUserSelect={handleUserSelect}
        />
        <div className="flex-1">
          <UserConversation
            messages={messages}
            selectedUserId={selectedUser}
            onMessageSent={() => selectedUser && fetchMessages(selectedUser)}
          />
        </div>
      </div>
    </Card>
  );
};
