
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MessageInput } from "./messages/MessageInput";
import { MessageList } from "./messages/MessageList";
import { useMessages } from "@/hooks/useMessages";

const Messages = () => {
  const { toast } = useToast();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { messages, hasNewMessage, fetchMessages } = useMessages(adminId, isAdmin);

  useEffect(() => {
    checkAdminRole();
    fetchAdmin();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminRole();
      fetchAdmin();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkAdminRole = async () => {
    const { data } = await supabase.rpc('has_role', { role: 'admin' });
    setIsAdmin(!!data);
  };

  const fetchAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        console.log('No admin user found');
        toast({
          title: "Informação",
          description: "O administrador ainda não está disponível para mensagens.",
        });
        return;
      }
      
      setAdminId(data.user_id);
    } catch (error) {
      console.error('Error fetching admin:', error);
      toast({
        title: "Erro ao carregar informações do admin",
        description: "Não foi possível carregar as informações do administrador.",
        variant: "destructive",
      });
    }
  };

  // If user is admin, redirect to admin page
  if (isAdmin) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="border-b">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-500" />
                <CardTitle className="text-2xl text-primary-500">Mensagens da Nutricionista</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {hasNewMessage && (
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-4">
            {adminId && (
              <>
                <MessageList messages={messages} adminId={adminId} />
                <MessageInput adminId={adminId} onMessageSent={fetchMessages} />
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default Messages;
