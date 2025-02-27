import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();
    
    console.log('Gerando plano de treino para usuário:', userId);
    console.log('Preferências:', preferences);

    const systemPrompt = `Você é um especialista em educação física e personal trainer. 
    Gere um plano de treino personalizado baseado nas preferências e objetivos do usuário.
    O plano deve ser detalhado, progressivo e adequado ao nível de experiência do usuário.`;

    const prompt = `
    Dados do usuário e preferências:
    ${JSON.stringify(preferences, null, 2)}

    Por favor, gere um plano de treino que inclua:
    1. Divisão semanal de treinos
    2. Exercícios específicos para cada dia
    3. Séries, repetições e intervalos
    4. Instruções de aquecimento e finalização
    5. Progressão ao longo das semanas
    6. Considerações especiais baseadas nas condições de saúde informadas
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro ao gerar plano de treino');
    }

    // Processa a resposta da IA para estruturar o plano de treino
    const workoutPlan = processWorkoutPlanResponse(data.choices[0].message.content);

    return new Response(
      JSON.stringify(workoutPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function processWorkoutPlanResponse(content: string) {
  try {
    const parsedPlan = JSON.parse(content);
    return parsedPlan;
  } catch (error) {
    console.error("Erro ao processar resposta do plano de treino:", error);
    return { error: "Erro ao processar a resposta da IA" };
  }
}
