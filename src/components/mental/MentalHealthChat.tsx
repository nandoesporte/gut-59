
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUp, Loader2, AlertTriangle, BrainCircuit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const MentalHealthChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Eu sou sua assistente de saúde mental. Como posso ajudar você hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim()) return;

    setErrorMessage(null);
    const userMessage = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Using the LlamaAPI with Nous-Hermes-2-Mixtral-8x7B-DPO model
      const { data, error } = await supabase.functions.invoke("mental-health-chat-llama", {
        body: { 
          message: input,
          history: messages
        },
      });

      if (error) {
        console.error("Função retornou erro:", error);
        throw new Error(error.message || "Erro ao chamar a função mental-health-chat-llama");
      }

      if (data?.error) {
        console.error("Erro na resposta da função:", data.error);
        throw new Error(data.error);
      }

      if (data?.response) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      } else {
        throw new Error("Resposta não recebida");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setErrorMessage("Não foi possível obter resposta. A API pode estar temporariamente indisponível.");
      
      toast({
        title: "Erro na comunicação",
        description: "Não foi possível obter resposta do modelo Nous-Hermes-2-Mixtral-8x7B-DPO. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
        <BrainCircuit className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Essa mensagem será excluída imediatamente após fechar este chat. Não armazenamos suas mensagens!
        </AlertDescription>
      </Alert>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <Avatar className="h-8 w-8 bg-primary-50">
                <AvatarImage src="/lovable-uploads/9456a3bf-9bc8-45d6-9105-dd939e3362f5.png" alt="IA" />
                <AvatarFallback>IA</AvatarFallback>
              </Avatar>
            )}
            <div
              className={`rounded-lg p-4 max-w-[80%] ${
                message.role === "user"
                  ? "bg-primary-500 text-white"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === "user" && (
              <Avatar className="h-8 w-8">
                <AvatarFallback>EU</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {errorMessage && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="resize-none min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-10 w-10 shrink-0 self-end"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowUp className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};
