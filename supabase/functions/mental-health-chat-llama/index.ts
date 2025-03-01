
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Function to implement exponential backoff for retries
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 300
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000); // 40-second timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    if (retries <= 1) throw err;
    
    // Calculate backoff with jitter
    const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15
    const delay = Math.min(backoff * jitter, 10000);
    
    console.log(`Retry attempt in ${delay}ms. Retries left: ${retries - 1}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
}

// Function to get a random fallback response
function getFallbackResponse(): string {
  const fallbackResponses = [
    "Estou com dificuldades técnicas no momento. Se você está passando por uma situação difícil, considere conversar com alguém de confiança ou buscar ajuda profissional. Voltarei a funcionar normalmente assim que possível.",
    "Parece que estou enfrentando problemas de conexão. Enquanto isso, lembre-se que praticar respiração profunda e exercícios de atenção plena podem ajudar em momentos de ansiedade.",
    "Desculpe pela interrupção. Nossos sistemas estão tendo dificuldades. Neste meio tempo, considere escrever seus pensamentos em um diário ou praticar uma atividade que lhe traga calma.",
    "Não estou conseguindo me conectar aos servidores. Durante esta pausa, você poderia experimentar técnicas de auto-cuidado como tomar um copo de água, fazer uma caminhada curta ou praticar respiração profunda."
  ];

  const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
  return fallbackResponses[randomIndex];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, history, checkConfiguration } = await req.json();
    
    // Endpoint for checking API key configuration
    if (checkConfiguration) {
      const apiKey = Deno.env.get("LLAMA_API_KEY");
      return new Response(
        JSON.stringify({
          apiKeySet: Boolean(apiKey),
          missingApiKey: !apiKey
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LLAMA_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: "LLAMA_API_KEY is not set",
          fallbackResponse: "O serviço de chat está temporariamente indisponível. Entre em contato com o administrador."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Format history for the API
    const conversationHistory = history?.map((item: any) => ({
      role: item.role,
      content: item.content
    })) || [];
    
    // Add the new user message
    conversationHistory.push({
      role: "user",
      content: message
    });

    console.log(`Sending request to LlamaAPI with ${conversationHistory.length} messages`);
    
    // Add system prompt
    const systemPrompt = `Você é uma assistente de saúde mental que fala português. Você é gentil, empática e fornece suporte emocional e orientações sobre saúde mental. Você não é uma médica e não fornece diagnósticos médicos, apenas apoio e orientações gerais. Você sempre responde em português, de forma respeitosa e compreensiva. Suas respostas são concisas e práticas, com no máximo 3 parágrafos.`;

    try {
      // Make multiple attempts with exponential backoff
      const response = await fetchWithRetry(
        "https://api.llama.cloud/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "llama-3-8b-8192",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              ...conversationHistory
            ],
            temperature: 0.7,
            max_tokens: 800
          }),
        },
        4,  // 4 retry attempts
        500  // starting backoff of 500ms
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("API error:", data);
        throw new Error(`API error: ${JSON.stringify(data)}`);
      }

      const reply = data.choices?.[0]?.message?.content || "";

      if (!reply) {
        throw new Error("Empty response from API");
      }

      return new Response(
        JSON.stringify({ response: reply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error calling LlamaAPI:", error);
      
      // Check if the error is network-related
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isNetworkError = 
        errorMsg.includes("network") || 
        errorMsg.includes("fetch") || 
        errorMsg.includes("connection") ||
        errorMsg.includes("ECONNREFUSED") ||
        errorMsg.includes("ETIMEDOUT") ||
        errorMsg.includes("aborted") ||
        errorMsg.includes("timeout");
      
      return new Response(
        JSON.stringify({
          error: `Error calling LlamaAPI: ${errorMsg}`,
          errorType: isNetworkError ? "network" : "api",
          fallbackResponse: getFallbackResponse()
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        fallbackResponse: getFallbackResponse()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
