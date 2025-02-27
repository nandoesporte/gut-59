
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY não está configurada');
    }

    const { systemPrompt, userPrompt, temperature = 0.7, maxTokens = 4096 } = await req.json();

    console.log('Iniciando requisição para o modelo Llama 3.1 8B Instant 128k');
    console.log('System Prompt:', systemPrompt.substring(0, 100) + '...');
    console.log('User Prompt (início):', userPrompt.substring(0, 100) + '...');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      })
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error('Erro na resposta do Groq:', errorData);
      throw new Error(`Erro na API do Groq: ${groqResponse.status} ${groqResponse.statusText}`);
    }

    const responseData = await groqResponse.json();
    console.log('Resposta recebida com sucesso');

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido', 
        stack: error instanceof Error ? error.stack : undefined 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
