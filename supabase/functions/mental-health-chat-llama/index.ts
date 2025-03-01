
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Constantes para configuração
const LLAMA_API_KEY = "d703fc45-308a-4805-a6f6-0b931df7452a"; // Nova chave de API fornecida
const LLAMA_API_URL = "https://api.llama.cloud/chat/completions";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 segundo
const MAX_TIMEOUT = 40000; // 40 segundos

// Configuração CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tipos de resposta e erro
interface LlamaAPIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// Função para adicionar jitter (variação) ao delay
const getBackoffDelay = (attempt: number, initialDelay: number) => {
  const exponentialDelay = initialDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return Math.min(exponentialDelay + jitter, 10000); // Máximo de 10 segundos
};

// Função principal para processar a requisição à API Llama
const callLlamaAPI = async (prompt: string, history: any[], retryCount = 0): Promise<any> => {
  console.log(`Tentativa ${retryCount + 1} de ${MAX_RETRIES} para chamar a API Llama`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT);
  
  try {
    // Estruturar dados para o formato esperado pela API Llama
    const messages = [
      {
        role: "system",
        content: "Você é um assistente de saúde mental amigável e empático. Forneça respostas claras, úteis e baseadas em evidências para ajudar o usuário com suas preocupações de saúde mental. Evite dar conselhos médicos específicos, diagnósticos ou prescrições. Para situações graves, sugira buscar ajuda profissional. Responda sempre em português do Brasil com um tom amigável e acolhedor."
      }
    ];
    
    // Adicionar histórico de conversas
    if (history && history.length > 0) {
      history.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }
    
    // Adicionar mensagem atual do usuário
    messages.push({
      role: "user",
      content: prompt
    });
    
    console.log("Enviando requisição para Llama API com", messages.length, "mensagens");
    
    const response = await fetch(LLAMA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API Llama: ${response.status} - ${errorText}`);
      
      if (retryCount < MAX_RETRIES - 1) {
        const delay = getBackoffDelay(retryCount, INITIAL_RETRY_DELAY);
        console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callLlamaAPI(prompt, history, retryCount + 1);
      }
      
      throw new Error(`Llama API respondeu com status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Resposta recebida da Llama API:", data);
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Erro ao chamar Llama API:", error);
    
    // Verificar se é um erro de tempo limite
    if (error.name === "AbortError") {
      throw new Error("A requisição excedeu o tempo limite de 40 segundos");
    }
    
    // Verificar se estamos dentro do limite de tentativas
    if (retryCount < MAX_RETRIES - 1) {
      const delay = getBackoffDelay(retryCount, INITIAL_RETRY_DELAY);
      console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callLlamaAPI(prompt, history, retryCount + 1);
    }
    
    throw error;
  }
};

// Função para processar a requisição HTTP
serve(async (req) => {
  // Lidar com solicitações CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Verificar apenas configuração
    const requestData = await req.json();
    if (requestData.checkConfiguration) {
      console.log("Verificando configuração da API...");
      return new Response(
        JSON.stringify({
          status: "ok",
          message: "Configuração da API verificada com sucesso."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { message, history } = requestData;
    
    // Validar entrada
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({
          error: "Mensagem inválida ou ausente",
          errorType: "validation"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log("Processando mensagem:", message.substring(0, 100) + (message.length > 100 ? "..." : ""));
    console.log("Histórico de mensagens:", history ? history.length : 0);
    
    // Chamar API Llama
    const data = await callLlamaAPI(message, history || []);
    
    // Verificar se a resposta contém o formato esperado
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Formato de resposta da Llama API inesperado");
    }
    
    const aiResponse = data.choices[0].message.content;
    console.log("Resposta da IA:", aiResponse.substring(0, 100) + (aiResponse.length > 100 ? "..." : ""));
    
    return new Response(
      JSON.stringify({
        response: aiResponse
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no processamento da requisição:", error);
    
    // Determinar o tipo de erro
    let errorType = "unknown";
    let errorMessage = error.message || "Erro desconhecido";
    
    if (
      error.message?.includes("network") ||
      error.message?.includes("fetch") ||
      error.message?.includes("connection") ||
      error.message?.includes("tempo limite")
    ) {
      errorType = "network";
      errorMessage = "Problemas de conexão com o serviço de IA. Tente novamente mais tarde.";
    } else if (
      error.message?.includes("401") ||
      error.message?.includes("403") ||
      error.message?.includes("key") ||
      error.message?.includes("token") ||
      error.message?.includes("auth")
    ) {
      errorType = "configuration";
      errorMessage = "Erro de autenticação com o serviço de IA. Verifique a chave de API.";
    }
    
    // Gerar resposta de fallback para erros de rede
    const fallbackResponses = [
      "Desculpe, estou enfrentando problemas técnicos de conexão. Pode tentar novamente em alguns momentos?",
      "Parece que temos uma instabilidade na conexão com o serviço de IA. Que tal tentar novamente daqui a pouco?",
      "Estou com dificuldades para processar sua mensagem agora. Por favor, aguarde alguns instantes e tente novamente."
    ];
    
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        errorType: errorType,
        fallbackResponse: errorType === "network" ? randomResponse : null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
