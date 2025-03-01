import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Get API key from environment variables
const LLAMA_API_KEY = Deno.env.get("LLAMA_API_KEY");
const LLAMA_API_URL = "https://api.llama.cloud/chat/completions";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility function to add delay for retry
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to check if error is related to network connectivity
const isNetworkError = (error: Error): boolean => {
  const errorMessage = error.message.toLowerCase();
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('sending request') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('unreachable') ||
    errorMessage.includes('dns') ||
    errorMessage.includes('connect')
  );
};

// Static fallback responses for when all retries fail
const getFallbackResponse = () => {
  const fallbackResponses = [
    "Desculpe, estou enfrentando problemas de conexão neste momento. Por favor, tente novamente mais tarde. Se precisar de ajuda imediata com questões de saúde mental, considere ligar para um serviço de apoio como o CVV (Centro de Valorização da Vida) pelo número 188.",
    
    "Parece que estou tendo dificuldades para me conectar aos meus serviços. Enquanto isso, lembre-se que práticas como respiração profunda, meditação por 5 minutos, ou uma caminhada curta podem ajudar a reduzir a ansiedade momentânea.",
    
    "Não consegui processar sua mensagem devido a problemas técnicos. Por favor, tente novamente em alguns minutos. Lembre-se que o autocuidado é importante - beber água, descansar adequadamente e fazer pausas das telas são práticas que podem ajudar seu bem-estar.",
    
    "Estou com dificuldades técnicas no momento. Se você está passando por uma situação difícil, considere conversar com alguém de confiança ou buscar ajuda profissional. Voltarei a funcionar normalmente assim que possível."
  ];
  
  // Randomly select one of the fallback responses
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    // Special case: If the client is checking configuration
    if (requestData.checkConfiguration) {
      const configStatus = {
        apiKeySet: !!LLAMA_API_KEY,
        missingApiKey: !LLAMA_API_KEY
      };
      
      return new Response(
        JSON.stringify(configStatus),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { message, history = [] } = requestData;
    console.log(`Received message: ${message?.substring(0, 50)}...`);
    console.log(`History length: ${history.length}`);
    
    if (!message) {
      throw new Error("Missing required parameter: message");
    }

    // Verify API key is set before making any API calls
    if (!LLAMA_API_KEY) {
      console.error("LLAMA_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({
          error: "API configuration error: Missing API key",
          missingApiKey: true,
          fallbackResponse: "O serviço de chat de saúde mental não está configurado corretamente. Por favor, entre em contato com o suporte."
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // System prompt for mental health guidance
    const systemPrompt = `Você é um assistente de saúde mental empático e compassivo. 
Você oferece apoio, orientação e estratégias para lidar com questões de saúde mental.
Suas respostas devem ser:
- Empáticas e acolhedoras, reconhecendo os sentimentos da pessoa
- Informativas, oferecendo insights sobre saúde mental
- Construtivas, sugerindo estratégias práticas e exercícios
- Responsáveis, nunca diagnosticando condições médicas
- Encorajadoras, promovendo autocompaixão e autocuidado
- Respeitosas dos limites profissionais, recomendando buscar ajuda profissional quando apropriado

Responda em português do Brasil com um tom caloroso e acolhedor. Se a pessoa estiver em crise ou risco, sempre priorize sua segurança e recomende recursos de emergência.`;

    // Prepare the conversation for the LlamaAPI - limit history to prevent token issues
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ];

    console.log("Sending request to LlamaAPI with model: nous-hermes-2-mixtral-8x7b-dpo");
    
    // Make the request to the LlamaAPI with retry logic
    let response = null;
    let retryCount = 0;
    const maxRetries = 3;
    let lastError = null;
    
    while (retryCount <= maxRetries && !response) {
      try {
        if (retryCount > 0) {
          console.log(`Retry attempt ${retryCount}/${maxRetries}`);
          
          // For retries, trim the message history to reduce token count
          if (messages.length > 3) {
            // Keep system prompt and last 2 exchanges
            const trimmedMessages = [
              messages[0], // System prompt
              ...messages.slice(-4) // Last 2 exchanges (2 messages per exchange)
            ];
            console.log(`Reduced message history from ${messages.length} to ${trimmedMessages.length} for retry`);
            messages.splice(0, messages.length, ...trimmedMessages);
          }
        }
        
        // Construct request body with consistent parameters
        const requestBody = {
          model: "nous-hermes-2-mixtral-8x7b-dpo",
          messages: messages,
          max_tokens: 800,
          temperature: 0.7,
          top_p: 0.9,
          stream: false
        };
        
        console.log(`Sending request to ${LLAMA_API_URL}`);
        
        // Set longer timeout for fetch request and use appropriate fetch options
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000); // 35-second timeout
        
        const fetchResponse = await fetch(LLAMA_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LLAMA_API_KEY}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`Response status: ${fetchResponse.status}`);
        
        // Handle non-200 responses
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error(`LlamaAPI error (${fetchResponse.status}): ${errorText}`);
          
          throw new Error(`LlamaAPI returned status ${fetchResponse.status}: ${errorText}`);
        } else {
          // Parse the successful response
          response = await fetchResponse.json();
          console.log(`LlamaAPI response received successfully`);
        }
      } catch (fetchError) {
        lastError = fetchError;
        console.error(`Fetch error (attempt ${retryCount + 1}/${maxRetries + 1}): ${fetchError.message}`);
        
        // Check if this is a network error
        const isNetwork = isNetworkError(fetchError);
        if (isNetwork) {
          console.log("Network-related error detected");
        }
        
        // Continue with the retry loop
        if (retryCount < maxRetries) {
          const backoffMs = Math.pow(2, retryCount + 1) * 1000; // 2s, 4s, 8s
          console.log(`Waiting ${backoffMs}ms before retry ${retryCount + 1}`);
          await delay(backoffMs);
        }
      }
      
      retryCount++;
    }
    
    // If we have an error after all retries, use fallback
    if (!response) {
      const isNetworkIssue = lastError && isNetworkError(lastError);
      const errorType = isNetworkIssue ? "network" : "api";
      const errorMsg = lastError ? lastError.message : "Unknown error occurred";
      
      console.error(`Failed after ${maxRetries} retries: ${errorMsg}`);
      console.log(`Using fallback response with error type: ${errorType}`);
      
      return new Response(
        JSON.stringify({ 
          error: errorMsg,
          errorType: errorType, 
          fallbackResponse: getFallbackResponse()
        }),
        { 
          status: 502, // Bad Gateway for network issues
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Extract the assistant's response
    const assistantResponse = response.choices[0].message.content;
    console.log(`Assistant response generated (${assistantResponse.length} chars)`);

    // Return the response
    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      }
    );
  } catch (error) {
    console.error("Error in mental-health-chat-llama function:", error.message);
    
    // Check if this is a network-related error
    const isNetworkIssue = isNetworkError(error);
    
    // Provide a helpful response to the client with specific error type
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro interno no processamento da solicitação",
        errorType: isNetworkIssue ? "network" : "api",
        fallbackResponse: getFallbackResponse()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    );
  }
});
