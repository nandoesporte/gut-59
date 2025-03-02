
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history, model } = await req.json();
    
    // Log received data
    console.log(`Received message: ${message.substring(0, 50)}...`);
    console.log(`Using model: ${model || "llama3-8b-8192"}`);
    
    // Default to llama3-8b-8192 if no model is specified
    const useModel = model || "llama3-8b-8192";
    
    // Access GROQ API key from environment variables
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY não está definida no ambiente");
    }

    // Prepare conversation history for the API call
    const messages = [];
    
    // Add system message to guide the model
    messages.push({
      role: "system",
      content: `Você é um assistente de saúde mental chamado FitChat. Sua função é fornecer apoio emocional, 
      dicas para bem-estar mental e sugestões de gerenciamento de estresse. Você é empático, 
      compreensivo e positivo. Sempre tente responder de forma acolhedora, evitando linguagem 
      técnica excessiva. Lembre-se que você NÃO é um substituto para aconselhamento médico ou 
      terapia profissional - em casos graves, sugira que a pessoa procure ajuda especializada.
      
      Mantenha suas respostas concisas, entre 3-5 parágrafos. Use linguagem simples e direta.
      Seja respeitoso e evite dar diagnósticos ou oferecer conselhos médicos específicos.`
    });
    
    // Add previous conversation history if available
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }
    
    // Add the current user message
    messages.push({
      role: "user",
      content: message
    });

    console.log(`Total conversation messages: ${messages.length}`);

    // Call Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: useModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Groq API error:", errorData);
      throw new Error(`Erro na API Groq: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log("Received response from Groq API");

    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
      throw new Error("Formato de resposta inválido da API Groq");
    }

    const assistantResponse = data.choices[0].message.content;
    console.log(`Response length: ${assistantResponse.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        response: assistantResponse
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("Error in mental-health-chat:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro desconhecido ao processar a solicitação"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
