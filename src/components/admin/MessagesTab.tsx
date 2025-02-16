import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { UserList } from "./messages/UserList";
import { UserConversation } from "./messages/UserConversation";

interface User {
  id: string;
  name: string | null;
  photo_url: string | null;
  unread_messages?: number;
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
  const [personalUsers, setPersonalUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useEffect(() => {
    fetchUsers();
    
    const channel = supabase
      .channel('messages_admin')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, () => {
        setHasNewMessage(true);
        if (selectedUser) {
          fetchMessages(selectedUser);
        }
        fetchUsers();
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

      // Get admin user ID
      const { data: adminData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .maybeSingle();

      // Get personal trainer user ID
      const { data: personalData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'personal')
        .maybeSingle();

      const excludeIds = [
        adminData?.user_id,
        personalData?.user_id
      ].filter(Boolean); // Filter out undefined values

      // Fetch users who have messages with the nutritionist
      const { data: nutritionistUsers, error: nutritionistError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          photo_url,
          unread_messages:messages!messages_receiver_id_fkey(count)
        `)
        .not('id', 'in', `(${excludeIds.join(',')})`);

      if (nutritionistError) throw nutritionistError;

      // Fetch users who have messages with the personal trainer
      const { data: personalUsers, error: personalError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          photo_url,
          unread_messages:messages!messages_receiver_id_fkey(count)
        `)
        .not('id', 'in', `(${excludeIds.join(',')})`);

      if (personalError) throw personalError;
      
      const nutritionistUsersWithUnreadCount = nutritionistUsers?.map(user => ({
        ...user,
        unread_messages: user.unread_messages?.[0]?.count || 0
      })) || [];

      const personalUsersWithUnreadCount = personalUsers?.map(user => ({
        ...user,
        unread_messages: user.unread_messages?.[0]?.count || 0
      })) || [];
      
      setUsers(nutritionistUsersWithUnreadCount);
      setPersonalUsers(personalUsersWithUnreadCount);
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

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-500" />
              <h2 className="text-2xl font-semibold text-primary-500">Mensagens dos Usuários</h2>
            </div>
            <div className="flex items-center gap-2">
              {hasNewMessage && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-6">
            <Tabs defaultValue="nutritionist" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="nutritionist">Mensagens da Nutricionista</TabsTrigger>
                <TabsTrigger value="personal">Mensagens do Personal</TabsTrigger>
              </TabsList>

              <TabsContent value="nutritionist">
                <div className="flex gap-4 h-[600px]">
                  <UserList
                    users={users}
                    selectedUser={selectedUser}
                    onUserSelect={(userId) => {
                      setSelectedUser(userId);
                      fetchMessages(userId);
                    }}
                  />
                  <div className="flex-1">
                    <UserConversation
                      messages={messages}
                      selectedUserId={selectedUser}
                      onMessageSent={() => selectedUser && fetchMessages(selectedUser)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="personal">
                <div className="flex gap-4 h-[600px]">
                  <UserList
                    users={personalUsers}
                    selectedUser={selectedUser}
                    onUserSelect={(userId) => {
                      setSelectedUser(userId);
                      fetchMessages(userId);
                    }}
                  />
                  <div className="flex-1">
                    <UserConversation
                      messages={messages}
                      selectedUserId={selectedUser}
                      onMessageSent={() => selectedUser && fetchMessages(selectedUser)}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
