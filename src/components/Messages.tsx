
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

const Messages = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, payload => {
        if (payload.new.receiver_id === receiverId || payload.new.sender_id === receiverId) {
          fetchMessages();
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [receiverId]);

  const fetchUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, photo_url')
        .neq('id', user.id);

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async () => {
    if (!receiverId) return;

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
          profiles!messages_sender_id_fkey (
            name,
            photo_url
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !receiverId) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          receiver_id: receiverId,
        });

      if (error) throw error;

      setNewMessage("");
      await fetchMessages();
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

  const selectUser = (userId: string) => {
    setReceiverId(userId);
    fetchMessages();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-2xl text-primary-500">Mensagens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {availableUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => selectUser(user.id)}
              className={`flex flex-col items-center space-y-2 cursor-pointer p-2 rounded-lg ${
                receiverId === user.id ? 'bg-primary-50' : ''
              }`}
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={user.photo_url || undefined} alt={user.name} />
                <AvatarFallback>
                  {user.name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{user.name || 'Usuário'}</span>
            </div>
          ))}
        </div>

        {receiverId && (
          <>
            <div className="space-y-4 h-[400px] overflow-y-auto p-4 border rounded-lg">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-2 ${
                    message.sender_id === receiverId ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={message.profiles?.photo_url || undefined}
                      alt={message.profiles?.name || ""}
                    />
                    <AvatarFallback>
                      {message.profiles?.name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      message.sender_id === receiverId
                        ? 'bg-gray-100'
                        : 'bg-primary-500 text-white'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Messages;
