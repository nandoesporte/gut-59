
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUp, Loader2, AlertTriangle, BrainCircuit, RefreshCw, WifiOff } from "lucide-react";
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
  const [retryCount, setRetryCount] = useState(0);
  const [networkError, setNetworkError] = useState(false);
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
    setNetworkError(false);
    const userMessage = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Calculate how many messages to send based on retry count
      // If we've retried multiple times, reduce the history to avoid token issues
      const historyLimit = Math.max(3, 6 - retryCount);
      const historyToSend = messages.slice(-historyLimit);
      
      // Using the LlamaAPI with Nous-Hermes-2-Mixtral-8x7B-DPO model
      const { data, error } = await supabase.functions.invoke("mental-health-chat-llama", {
        body: { 
          message: input,
          history: historyToSend
        },
      });

      if (error) {
        console.error("Função retornou erro:", error);
        if (error.message?.includes("network") || error.message?.includes("failed to fetch")) {
          setNetworkError(true);
        }
        throw new Error(error.message || "Erro ao chamar a função mental-health-chat-llama");
      }

      if (!data) {
        throw new Error("Resposta vazia recebida da API");
      }

      if (data?.error) {
        console.error("Erro na resposta da função:", data.error);
        if (data.fallbackResponse) {
          // If we have a fallback response from the edge function, use it
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.fallbackResponse },
          ]);
        } else {
          throw new Error(data.error);
        }
      } else if (data?.response) {
        // Validate response is not empty
        if (!data.response.trim()) {
          throw new Error("A resposta recebida está vazia");
        }
        
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
        
        // Reset retry count on successful response
        setRetryCount(0);
      } else {
        throw new Error("Resposta não recebida");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      // Check for network-related errors
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isNetworkError = 
        errorMsg.includes("network") || 
        errorMsg.includes("failed to fetch") || 
        errorMsg.includes("sending request");
      
      if (isNetworkError) {
        setNetworkError(true);
        setErrorMessage(
          "Parece que estamos com problemas de conexão. Verifique sua internet ou tente novamente mais tarde."
        );
      } else {
        setErrorMessage(
          "Não foi possível obter resposta. O serviço pode estar temporariamente indisponível."
        );
      }
      
      toast({
        title: "Erro na comunicação",
        description: isNetworkError 
          ? "Problemas de conexão detectados. Verifique sua internet."
          : "Não foi possível obter resposta do modelo. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    setErrorMessage(null);
    setNetworkError(false);
    
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.role === "user");
    
    if (lastUserMessageIndex !== -1) {
      const lastUserMessage = messages[messages.length - 1 - lastUserMessageIndex];
      setInput(lastUserMessage.content);
      
      // If we've already retried multiple times, truncate the conversation history
      if (retryCount > 1) {
        const reducedMessages = messages.slice(0, Math.max(2, messages.length - retryCount * 2));
        setMessages(reducedMessages);
        toast({
          title: "Reiniciando conversa",
          description: "Reiniciamos parte da conversa para tentar resolver problemas de comunicação.",
        });
      }
    } else {
      setInput("");
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
            {networkError ? (
              <WifiOff className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription className="flex items-center justify-between">
              <span>{errorMessage}</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2 bg-transparent" 
                onClick={handleRetry}
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Tentar novamente
              </Button>
            </AlertDescription>
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
