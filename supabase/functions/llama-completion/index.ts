
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Recebendo solicitação para llama-completion");
    const { prompt, max_tokens = 4000, temperature = 0.7, language = "pt-BR" } = await req.json();

    if (!prompt) {
      throw new Error("Prompt é obrigatório");
    }

    // Verificar se temos a API key do Groq
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY não está configurada");
    }

    console.log("Enviando solicitação para API do Groq");
    
    try {
      // Tentar com Groq primeiro
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: `Você é um assistente especializado em nutrição e planejamento alimentar, capaz de gerar planos alimentares personalizados em formato JSON.
              
É MUITO IMPORTANTE:
1. Todos os valores de macros (protein, carbs, fats, fiber) DEVEM ser numéricos, SEM "g" no final.
2. TODAS as respostas devem ser em português do Brasil.
3. Todos os nomes de refeições, alimentos e descrições DEVEM ser em português.
4. Use nomes como "café da manhã", "lanche da manhã", "almoço", "lanche da tarde", "jantar" para as refeições.
5. As propriedades do JSON (weeklyPlan, meals, macros, etc.) permanecem em inglês, mas TODO o conteúdo textual deve ser em português.
6. Os dias da semana devem ser em português: "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo".
7. O formato do JSON deve seguir exatamente este modelo:
{
  "weeklyPlan": {
    "segunda": { ... },
    "terça": { ... },
    ...
  },
  "weeklyTotals": { ... },
  "recommendations": { ... }
}
8. NUNCA aninhe o plano dentro de outro objeto como "mealPlan" ou similar.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: max_tokens,
          temperature: temperature
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro na API do Groq: ${response.status} ${response.statusText}`);
        console.error("Detalhes do erro:", errorText);
        throw new Error(`Erro na API do Groq: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const completion = data.choices[0].message.content;
      
      // Log para debug - ver se o conteúdo está em português
      console.log("Resposta da API Groq recebida com sucesso");
      console.log("Primeiros 200 caracteres:", completion.substring(0, 200));

      return new Response(JSON.stringify({ completion, modelUsed: 'groq-llama3-8b' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (groqError) {
      console.error("Erro com API do Groq:", groqError);
      
      // Se temos API key do OpenAI como fallback
      if (OPENAI_API_KEY) {
        console.log("Tentando com OpenAI como fallback");
        
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Você é um assistente especializado em nutrição e planejamento alimentar, capaz de gerar planos alimentares personalizados em formato JSON.
                
É MUITO IMPORTANTE:
1. Todos os valores de macros (protein, carbs, fats, fiber) DEVEM ser numéricos, SEM "g" no final.
2. TODAS as respostas devem ser em português do Brasil.
3. Todos os nomes de refeições, alimentos e descrições DEVEM ser em português.
4. Use nomes como "café da manhã", "lanche da manhã", "almoço", "lanche da tarde", "jantar" para as refeições.
5. As propriedades do JSON (weeklyPlan, meals, macros, etc.) permanecem em inglês, mas TODO o conteúdo textual deve ser em português.
6. Os dias da semana devem ser em português: "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo".
7. O formato do JSON deve seguir exatamente este modelo:
{
  "weeklyPlan": {
    "segunda": { ... },
    "terça": { ... },
    ...
  },
  "weeklyTotals": { ... },
  "recommendations": { ... }
}
8. NUNCA aninhe o plano dentro de outro objeto como "mealPlan" ou similar.`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: max_tokens,
            temperature: temperature
          })
        });

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error(`Erro na API do OpenAI: ${openaiResponse.status} ${openaiResponse.statusText}`);
          console.error("Detalhes do erro:", errorText);
          throw new Error(`Erro na API do OpenAI: ${openaiResponse.status} ${openaiResponse.statusText}`);
        }

        const openaiData = await openaiResponse.json();
        const completion = openaiData.choices[0].message.content;
        
        // Log para debug - ver se o conteúdo está em português
        console.log("Resposta da API OpenAI recebida com sucesso");
        console.log("Primeiros 200 caracteres:", completion.substring(0, 200));

        return new Response(JSON.stringify({ completion, modelUsed: 'openai-gpt-4o-mini' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        throw new Error("API do Groq falhou e não há fallback para OpenAI disponível");
      }
    }
  } catch (error) {
    console.error("Erro em llama-completion:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message || "Erro interno no servidor",
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
