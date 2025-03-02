
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers for browser requests
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
    const { message, history, model = "mistral-saba-24b" } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: "Mensagem não fornecida" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    console.log(`Processando mensagem do usuário com o modelo ${model}`);
    
    // Formatar histórico de mensagens para o formato esperado pela API Groq
    const formattedHistory = history?.map((msg: { role: string; content: string }) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    })) || [];
    
    // Adicionar a nova mensagem do usuário ao histórico
    formattedHistory.push({
      role: "user",
      content: message
    });
    
    // Adicionar instruções de sistema
    const systemPrompt = "Você é um assistente de saúde mental especializado em suporte emocional para pacientes brasileiros. Responda com empatia e em português brasileiro. Ofereça conselhos úteis, não-medicamentosos baseados em terapias cognitivo-comportamentais e práticas de bem-estar. Mantenha suas respostas concisas, com no máximo 3 parágrafos. Se o usuário apresentar sinais de crise ou emergência, sugira buscar ajuda profissional imediata.";

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...formattedHistory
    ];

    // Chamar a API Groq
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      throw new Error("GROQ_API_KEY não está definida");
    }
    
    console.log(`Enviando ${messages.length} mensagens para a API Groq`);
    
    const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API Groq: ${response.status}`, errorText);
      throw new Error(`Erro na API Groq: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Resposta da API Groq recebida com sucesso");
    
    // Extrair a resposta do assistente
    const assistantResponse = data.choices[0]?.message?.content || "Desculpe, não consegui processar sua solicitação.";
    
    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Erro ao processar solicitação:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Erro ao processar a solicitação",
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
