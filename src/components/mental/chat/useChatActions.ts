
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Message } from "./types";

export const useChatActions = () => {
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
  const [apiUrlChecked, setApiUrlChecked] = useState(false);
  const [useGroqFallback, setUseGroqFallback] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fallbackResponses = [
    "Estou com dificuldades técnicas no momento. Se você está passando por uma situação difícil, considere conversar com alguém de confiança ou buscar ajuda profissional. Voltarei a funcionar normalmente assim que possível.",
    "Parece que estou enfrentando problemas de conexão. Enquanto isso, lembre-se que praticar respiração profunda e exercícios de atenção plena podem ajudar em momentos de ansiedade.",
    "Desculpe pela interrupção. Nossos sistemas estão tendo dificuldades. Neste meio tempo, considere escrever seus pensamentos em um diário ou praticar uma atividade que lhe traga calma.",
    "Não estou conseguindo me conectar aos servidores. Durante esta pausa, você poderia experimentar técnicas de auto-cuidado como tomar um copo de água, fazer uma caminhada curta ou praticar respiração profunda."
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getFallbackResponse = () => {
    const index = Math.min(retryCount, fallbackResponses.length - 1);
    return fallbackResponses[index];
  };

  const switchToGroq = () => {
    setUseGroqFallback(true);
    setNetworkError(false);
    setErrorMessage(null);
    toast({
      title: "Alternando para API secundária",
      description: "Tentaremos usar um serviço alternativo para processar sua mensagem.",
    });
    
    if (input) {
      handleSubmit();
    } else {
      const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.role === "user");
      if (lastUserMessageIndex !== -1) {
        const lastUserMessage = messages[messages.length - 1 - lastUserMessageIndex];
        setInput(lastUserMessage.content);
      }
    }
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
      console.log("Enviando mensagem para processamento...");
      const historyLimit = Math.max(3, 6 - retryCount);
      const historyToSend = messages.slice(-historyLimit);
      
      const endpoint = useGroqFallback ? "groq-chat" : "mental-health-chat-llama";
      console.log(`Usando endpoint: ${endpoint}`);
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: { 
          message: input,
          history: historyToSend
        },
      });

      console.log("Resposta recebida:", data);
      
      if (error) {
        console.error("Função retornou erro:", error);
        if (error.message?.includes("network") || 
            error.message?.includes("failed to fetch") || 
            error.message?.includes("sending request")) {
          setNetworkError(true);
        }
        throw new Error(error.message || `Erro ao chamar a função ${endpoint}`);
      }

      if (!data) {
        throw new Error("Resposta vazia recebida da API");
      }

      if (data?.error) {
        console.error("Erro na resposta da função:", data.error);
        
        if (data.errorType === "network") {
          setNetworkError(true);
          
          if (!useGroqFallback) {
            toast({
              title: "Problemas de conexão detectados",
              description: "Podemos tentar uma API alternativa. Clique no botão 'Usar serviço alternativo'.",
              duration: 8000,
            });
          }
        } else if (data.errorType === "configuration") {
          toast({
            title: "Problema de configuração",
            description: "O serviço de IA não está configurado corretamente. Um administrador precisa verificar as chaves de API.",
            variant: "destructive",
            duration: 10000,
          });
        }
        
        if (data.fallbackResponse) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.fallbackResponse },
          ]);
          
          toast({
            title: "Problemas de conexão detectados",
            description: "Estamos enfrentando dificuldades para acessar nossos servidores de IA. Fornecemos uma resposta alternativa.",
            variant: "destructive",
          });
        } else {
          throw new Error(data.error);
        }
      } else if (data?.response) {
        if (!data.response.trim()) {
          throw new Error("A resposta recebida está vazia");
        }
        
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
        
        setRetryCount(0);
        
        if (useGroqFallback) {
          toast({
            title: "Serviço alternativo funcionando",
            description: "Continuaremos usando o serviço alternativo para processar suas mensagens.",
          });
        }
      } else {
        throw new Error("Resposta não recebida");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isNetworkError = 
        errorMsg.includes("network") || 
        errorMsg.includes("failed to fetch") || 
        errorMsg.includes("sending request") ||
        errorMsg.includes("connectivity") ||
        errorMsg.includes("unreachable") || 
        errorMsg.includes("timeout");
      
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
      
      if (retryCount > 0) {
        setMessages((prev) => [
          ...prev,
          { 
            role: "assistant", 
            content: getFallbackResponse()
          },
        ]);
      }
      
      toast({
        title: "Erro na comunicação",
        description: isNetworkError 
          ? "Problemas de conexão detectados. Verifique sua internet."
          : "Não foi possível obter resposta do modelo. Tente novamente mais tarde.",
        variant: "destructive",
      });
      
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    setErrorMessage(null);
    setNetworkError(false);
    
    const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.role === "user");
    
    if (lastUserMessageIndex !== -1) {
      const lastUserMessage = messages[messages.length - 1 - lastUserMessageIndex];
      setInput(lastUserMessage.content);
      
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

  const checkApiConfiguration = async () => {
    if (apiUrlChecked) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("mental-health-chat-llama", {
        body: { checkConfiguration: true }
      });
      
      if (error || (data && data.error)) {
        if (data && data.missingApiKey) {
          setErrorMessage("API não configurada corretamente. Entre em contato com o administrador.");
        }
      }
    } catch (e) {
      console.error("Erro ao verificar configuração da API:", e);
    } finally {
      setApiUrlChecked(true);
    }
  };

  useEffect(() => {
    checkApiConfiguration();
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    errorMessage,
    networkError,
    useGroqFallback,
    messagesEndRef,
    handleSubmit,
    handleRetry,
    switchToGroq,
    scrollToBottom
  };
};
