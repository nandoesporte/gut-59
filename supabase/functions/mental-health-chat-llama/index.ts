
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
    
    // Make the request to the LlamaAPI
    try {
      const response = await fetch(LLAMA_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LLAMA_API_KEY}`
        },
        body: JSON.stringify({
          model: "nous-hermes-2-mixtral-8x7b-dpo",
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 0.9,
          stream: false
        })
      });

      // Handle API response
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`LlamaAPI error (${response.status}): ${errorText}`);
        throw new Error(`LlamaAPI error: ${response.status} - ${errorText}`);
      }

      // Parse the response
      const data = await response.json();
      console.log(`LlamaAPI response received: status ${response.status}`);

      // Extract the assistant's response
      const assistantResponse = data.choices[0].message.content;
      console.log(`Assistant response: ${assistantResponse.substring(0, 100)}...`);

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
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      throw new Error(`Erro na conexão com LlamaAPI: ${fetchError.message}`);
    }
  } catch (error) {
    console.error("Error in mental-health-chat-llama function:", error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro interno no processamento da solicitação" 
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
