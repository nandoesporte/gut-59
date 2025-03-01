
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const groqApiKey = Deno.env.get('GROQ_API_KEY');

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
    const { message, history } = await req.json();

    // Convert history to Groq's expected format
    const messages = [
      { 
        role: "system", 
        content: "Você é um assistente de saúde mental útil, empático e informativo. Você responde perguntas relacionadas à saúde mental, bem-estar emocional e psicológico. Você oferece conselhos gerais e estratégias de bem-estar, mas deixa claro que não substitui profissionais de saúde mental. Suas respostas são acolhedoras, respeitosas e em português do Brasil." 
      }
    ];
    
    // Add conversation history
    if (history && Array.isArray(history)) {
      history.forEach((msg) => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }
    
    // Add current message
    messages.push({
      role: "user",
      content: message
    });

    console.log("Sending request to Groq API with messages:", JSON.stringify(messages));

    // Using Mixtral 8x7B model
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API error:', errorData);
      throw new Error(`Groq API error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log("Received response from Groq API:", JSON.stringify(data));

    return new Response(JSON.stringify({ 
      response: data.choices[0].message.content 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in groq-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
