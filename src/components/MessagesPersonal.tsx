
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

const MessagesPersonal = () => {
  const { toast } = useToast();
  const [personalId, setPersonalId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPersonal, setIsPersonal] = useState(false);
  const { messages, hasNewMessage, fetchMessages } = useMessages(personalId, isPersonal);

  useEffect(() => {
    checkPersonalRole();
    fetchPersonal();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkPersonalRole();
      fetchPersonal();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkPersonalRole = async () => {
    const { data } = await supabase.rpc('has_role', { role: 'personal' });
    setIsPersonal(!!data);
  };

  const fetchPersonal = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'personal')
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        console.log('No personal user found');
        toast({
          title: "Informação",
          description: "O personal ainda não está disponível para mensagens.",
        });
        return;
      }
      
      setPersonalId(data.user_id);
    } catch (error) {
      console.error('Error fetching personal:', error);
      toast({
        title: "Erro ao carregar informações do personal",
        description: "Não foi possível carregar as informações do personal.",
        variant: "destructive",
      });
    }
  };

  // If user is personal, don't show this component
  if (isPersonal) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="border-b">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-500" />
                <CardTitle className="text-2xl text-primary-500">Mensagens do Personal</CardTitle>
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
            {personalId && (
              <>
                <MessageList messages={messages} adminId={personalId} isPersonal={true} />
                <MessageInput adminId={personalId} onMessageSent={fetchMessages} />
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default MessagesPersonal;
