
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const LLAMA_API_KEY = Deno.env.get("LLAMA_API_KEY");
const LLAMA_API_URL = "https://api.llama.cloud/chat/completions";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Mental Health Chat LlamaAPI function invoked");
    
    // Parse request body
    const { message, history = [] } = await req.json();
    console.log(`Received message: ${message}`);
    console.log(`History length: ${history.length}`);
    
    if (!message) {
      throw new Error("Missing required parameter: message");
    }

    if (!LLAMA_API_KEY) {
      console.error("LLAMA_API_KEY environment variable is not set");
      throw new Error("API configuration error: Missing API key");
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

    // Prepare the conversation for the LlamaAPI
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ];

    console.log("Sending request to LlamaAPI with model: nous-hermes-2-mixtral-8x7b-dpo");
    
    // Make the request to the LlamaAPI with retry logic
    let response = null;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries && !response) {
      try {
        if (retryCount > 0) {
          console.log(`Retry attempt ${retryCount}/${maxRetries}`);
        }
        
        const requestBody = {
          model: "nous-hermes-2-mixtral-8x7b-dpo",
          messages: messages,
          max_tokens: 800,
          temperature: 0.7,
          top_p: 0.9,
          stream: false
        };
        
        console.log(`Sending request to ${LLAMA_API_URL}`);
        
        const fetchResponse = await fetch(LLAMA_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LLAMA_API_KEY}`
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log(`Response status: ${fetchResponse.status}`);
        
        // Handle non-200 responses
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error(`LlamaAPI error (${fetchResponse.status}): ${errorText}`);
          
          // If we're on the last retry, throw the error so we can handle it
          if (retryCount === maxRetries) {
            throw new Error(`LlamaAPI returned status ${fetchResponse.status}: ${errorText}`);
          }
        } else {
          // Parse the successful response
          response = await fetchResponse.json();
          console.log(`LlamaAPI response received successfully`);
        }
      } catch (fetchError) {
        console.error(`Fetch error (attempt ${retryCount}/${maxRetries}):`, fetchError.message);
        
        // On last retry, rethrow
        if (retryCount === maxRetries) {
          throw new Error(`Failed to connect to LlamaAPI after ${maxRetries} attempts: ${fetchError.message}`);
        }
      }
      
      retryCount++;
      
      // If we need to retry, wait a bit before trying again (exponential backoff)
      if (!response && retryCount <= maxRetries) {
        const backoffMs = Math.pow(2, retryCount) * 500; // 1s, 2s, 4s
        console.log(`Waiting ${backoffMs}ms before retry ${retryCount}`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    // If we still don't have a response after all retries
    if (!response) {
      throw new Error("Failed to get a response from LlamaAPI after all retry attempts");
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
    
    // Provide a helpful response to the client
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro interno no processamento da solicitação",
        fallbackResponse: "Desculpe, estou enfrentando dificuldades técnicas no momento. Por favor, tente novamente mais tarde ou entre em contato com um profissional de saúde mental se precisar de assistência imediata."
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
