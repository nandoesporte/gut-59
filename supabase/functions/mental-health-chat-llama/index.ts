
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LLAMA_API_KEY = 'd703fc45-308a-4805-a6f6-0b931df7452a';
const LLAMA_API_URL = 'https://api.llama-api.com/chat/completions';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [], checkConfiguration = false, testConnection = false } = await req.json();
    
    console.log("Requisição recebida:", { message, historyLength: history.length, checkConfiguration, testConnection });
    
    // Verificação simples de conexão
    if (testConnection) {
      console.log("Testando conexão com a API Llama...");
      
      try {
        // Tenta uma requisição simplificada para a API
        const response = await fetch(LLAMA_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LLAMA_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama3-8b-8192",
            messages: [{ role: "user", content: "Olá, isso é um teste de conexão." }],
            max_tokens: 10,
            temperature: 0.7
          }),
        });
        
        const statusCode = response.status;
        const responseData = await response.json();
        
        console.log("Teste de API - Status:", statusCode);
        console.log("Teste de API - Resposta:", responseData);
        
        return new Response(
          JSON.stringify({ 
            success: statusCode >= 200 && statusCode < 300, 
            statusCode,
            apiResponse: responseData
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (testError) {
        console.error("Erro no teste de conexão:", testError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: testError instanceof Error ? testError.message : String(testError)
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    // Verificar configuração apenas se solicitado
    if (checkConfiguration) {
      console.log("Verificando configuração da API...");
      const isConfigured = LLAMA_API_KEY && LLAMA_API_KEY.length > 10;
      
      if (!isConfigured) {
        console.error("API não configurada corretamente: chave API ausente ou inválida");
        return new Response(
          JSON.stringify({
            error: "A chave da API Llama não está configurada corretamente.",
            errorType: "configuration",
            missingApiKey: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      return new Response(
        JSON.stringify({ configured: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validar entrada
    if (!message) {
      return new Response(
        JSON.stringify({ error: "Mensagem ausente na requisição" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Preparar histórico de mensagens para a API
    const messages = [
      ...history,
      { role: "user", content: message }
    ];

    console.log(`Enviando requisição para Llama API com ${messages.length} mensagens`);
    
    // Tenta a requisição com backoff exponencial e jitter
    const response = await fetchWithRetry(
      LLAMA_API_URL,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LLAMA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 0.95,
          stream: false
        }),
      },
      3 // número de tentativas
    );

    // Processar resposta
    const data = await response.json();
    console.log("Resposta recebida da API Llama:", data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Formato de resposta inesperado da API Llama");
    }
    
    const aiResponse = data.choices[0].message.content.trim();
    
    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Erro ao processar requisição:", error);
    
    // Determinar tipo de erro
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isNetworkError = 
      errorMsg.includes("network") || 
      errorMsg.includes("failed to fetch") || 
      errorMsg.includes("connection") ||
      errorMsg.includes("timed out") ||
      errorMsg.includes("EOF");
    
    // Gerar resposta alternativa contextual
    const fallbackResponse = isNetworkError 
      ? "Estou com problemas para acessar meus servidores. Poderia tentar novamente em alguns instantes? Enquanto isso, respirar fundo algumas vezes pode ajudar a reduzir a ansiedade."
      : "Desculpe, estou encontrando dificuldades para processar sua mensagem. Por favor, tente novamente com uma formulação diferente.";
    
    return new Response(
      JSON.stringify({
        error: `Erro ao chamar a API Llama: ${errorMsg}`,
        errorType: isNetworkError ? "network" : "processing",
        fallbackResponse
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Função de fetch com retry, backoff exponencial e jitter
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Adicionar timeout para evitar esperas infinitas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 40000); // 40 segundos timeout
      
      const fetchOptions = {
        ...options,
        signal: controller.signal,
      };
      
      console.log(`Tentativa ${attempt + 1}/${maxRetries} para ${url}`);
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error(`Resposta de erro HTTP ${response.status}:`, errorData);
        throw new Error(`Erro HTTP ${response.status}: ${errorData?.error || response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      console.error(`Tentativa ${attempt + 1} falhou:`, error);
      
      if (attempt < maxRetries - 1) {
        // Calcular tempo de espera com backoff exponencial e jitter
        const baseWait = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, ...
        const jitter = Math.random() * 1000; // 0-1s de jitter adicional
        const waitTime = baseWait + jitter;
        
        console.log(`Aguardando ${waitTime}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError || new Error("Falha após várias tentativas de conexão à API");
}
