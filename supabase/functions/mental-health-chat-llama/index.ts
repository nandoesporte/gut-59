
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const LLAMA_API_KEY = Deno.env.get("LLAMA_API_KEY");
const MAX_RETRIES = 3;
const TIMEOUT_MS = 40000; // 40 segundos de timeout

// Implementando uma função de espera para backoff exponencial
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para fazer chamadas à API com retry e backoff exponencial
const fetchWithRetry = async (url: string, options: RequestInit, retries = MAX_RETRIES, backoffFactor = 2) => {
  let lastError;
  let waitTime = 1000; // Tempo inicial de espera: 1 segundo

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`Tentativa ${attempt + 1}/${retries} para ${url}`);
      
      // Criar um AbortController para implementar timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      const fetchOptions = {
        ...options,
        signal: controller.signal,
      };
      
      // Fazer a chamada com timeout
      const response = await fetch(url, fetchOptions);
      
      // Limpar o timeout
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`Chamada para ${url} bem-sucedida na tentativa ${attempt + 1}`);
        return response;
      }
      
      // Se a resposta não for ok, ler o erro
      const errorData = await response.json().catch(() => ({}));
      lastError = new Error(
        `Erro na API: ${response.status} - ${response.statusText} - ${JSON.stringify(errorData)}`
      );
      console.error(`Tentativa ${attempt + 1} falhou com status ${response.status}:`, lastError.message);
      
    } catch (error) {
      // Verificar se é um erro de timeout
      if (error.name === "AbortError") {
        lastError = new Error("Timeout ao chamar a API (40s)");
        console.error(`Tentativa ${attempt + 1} abortada por timeout:`, lastError.message);
      } else {
        lastError = error;
        console.error(`Tentativa ${attempt + 1} falhou com erro:`, error.message || error);
      }
    }
    
    // Se não for a última tentativa, esperar com backoff exponencial
    if (attempt < retries - 1) {
      const jitter = Math.random() * 0.3 + 0.85; // Entre 0.85 e 1.15
      const waitTimeWithJitter = Math.floor(waitTime * jitter);
      console.log(`Aguardando ${waitTimeWithJitter}ms antes da próxima tentativa...`);
      await wait(waitTimeWithJitter);
      waitTime *= backoffFactor; // Aumentar o tempo de espera exponencialmente
    }
  }
  
  throw lastError || new Error("Falha após várias tentativas");
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LLAMA_API_KEY) {
      console.error("LLAMA_API_KEY não configurada");
      return new Response(
        JSON.stringify({
          error: "API não configurada",
          errorType: "configuration",
          missingApiKey: true,
          fallbackResponse: "Estou com dificuldades técnicas. Por favor, tente novamente mais tarde ou entre em contato com o suporte."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { message, history, checkConfiguration } = await req.json();

    // Apenas verificar configuração sem fazer chamada à API
    if (checkConfiguration) {
      return new Response(
        JSON.stringify({ 
          configured: true,
          apiKeyPresent: !!LLAMA_API_KEY
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verificar dados de entrada
    if (!message && !history?.length) {
      return new Response(
        JSON.stringify({
          error: "Mensagem ou histórico não fornecidos",
          errorType: "input"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Formatar mensagens para o modelo LlamaAPI
    const llamaMessages = [];
    
    // Processar histórico se disponível
    if (history && history.length > 0) {
      for (const entry of history) {
        llamaMessages.push({
          role: entry.role,
          content: entry.content
        });
      }
    }
    
    // Adicionar a mensagem atual do usuário
    if (message) {
      llamaMessages.push({
        role: "user",
        content: message
      });
    }

    console.log("Enviando requisição para a API Llama");
    console.log("URL:", "https://api.llama.cloud/chat/completions");
    console.log("Número de mensagens:", llamaMessages.length);

    const requestBody = {
      model: "llama-3-8b-chat",
      messages: llamaMessages,
      stream: false,
      max_tokens: 1024,
      temperature: 0.7
    };

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLAMA_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    };

    // Usar a função fetchWithRetry para melhor tratamento de erros
    const llamaResponse = await fetchWithRetry(
      "https://api.llama.cloud/chat/completions",
      requestOptions
    );
    
    const data = await llamaResponse.json();
    
    if (!data || !data.choices || !data.choices[0]) {
      console.error("Resposta da API inválida:", data);
      throw new Error("Resposta da API inválida ou vazia");
    }

    const responseMessage = data.choices[0].message.content;
    console.log("Resposta recebida com sucesso, tamanho:", responseMessage.length);

    return new Response(
      JSON.stringify({ response: responseMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Erro ao processar requisição:", error.message || error);
    
    // Determinar o tipo de erro
    let errorType = "unknown";
    let errorMessage = "Erro desconhecido";
    let fallbackResponse = null;
    
    if (error.message) {
      errorMessage = error.message;
      
      // Detecção de erros de rede
      if (
        error.message.includes("fetch failed") ||
        error.message.includes("network") ||
        error.message.includes("unreachable") ||
        error.message.includes("timeout") ||
        error.message.includes("abort") ||
        error.message.includes("connection") ||
        error.message.includes("Failed to fetch")
      ) {
        errorType = "network";
        fallbackResponse = "Estou enfrentando problemas para me conectar aos servidores. Podemos continuar nossa conversa mais tarde? Se você estiver passando por dificuldades, considere falar com alguém de confiança ou um profissional.";
      }
      
      // Detecção de erros de API
      else if (
        error.message.includes("API") ||
        error.message.includes("status") ||
        error.message.includes("401") ||
        error.message.includes("403") ||
        error.message.includes("429") ||
        error.message.includes("500")
      ) {
        errorType = "api";
        
        if (error.message.includes("401") || error.message.includes("403")) {
          fallbackResponse = "Estou com problemas de autenticação nos meus servidores. Nossa equipe já foi notificada e está trabalhando para resolver isso.";
        } else if (error.message.includes("429")) {
          fallbackResponse = "Estou recebendo muitas solicitações no momento. Vamos tentar novamente em alguns minutos?";
        } else {
          fallbackResponse = "Os servidores de IA estão temporariamente indisponíveis. Tente novamente mais tarde, ou considere usar o serviço alternativo.";
        }
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        errorType,
        fallbackResponse
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
