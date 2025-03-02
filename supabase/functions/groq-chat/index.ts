
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

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
    const { message, history, model = "llama3-8b-8192" } = await req.json();

    if (!message) {
      throw new Error("Mensagem não fornecida");
    }

    console.log(`Processando mensagem com modelo ${model}`);
    
    // Convert history to Groq format
    const formattedHistory = (history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }));

    // Add the current message to the history
    const messages = [
      { role: "system", content: "Você é um assistente de saúde mental compassivo, que responde em português. Você fornece apoio amigável, conselhos práticos e orientação sobre bem-estar emocional. Suas respostas são empáticas, não-julgadoras e baseadas em práticas de psicologia positiva e ciência comportamental. Você nunca dá diagnósticos médicos, mas encoraja os usuários a procurar ajuda profissional quando necessário." },
      ...formattedHistory,
      { role: "user", content: message }
    ];

    console.log("Enviando mensagens para a API do Groq:", JSON.stringify(messages));

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Erro na API do Groq (${response.status}):`, errorData);
      throw new Error(`Erro na API do Groq: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log("Resposta completa da API do Groq:", JSON.stringify(data));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Formato de resposta inesperado da API do Groq:", data);
      throw new Error("Formato de resposta inesperado");
    }

    const aiResponse = data.choices[0].message.content;
    console.log("Resposta processada da IA:", aiResponse);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erro no processamento:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Ocorreu um erro ao processar sua mensagem",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
