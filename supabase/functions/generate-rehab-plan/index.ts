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
    
    console.log('Gerando plano de reabilitação para usuário:', userId);
    console.log('Preferências:', preferences);

    const systemPrompt = `Você é um fisioterapeuta especializado. 
    Gere um plano de reabilitação personalizado baseado nas condições e necessidades do paciente.
    O plano deve ser seguro, progressivo e focado na recuperação funcional.`;

    const prompt = `
    Dados do paciente e condição:
    ${JSON.stringify(preferences, null, 2)}

    Por favor, gere um plano de reabilitação que inclua:
    1. Avaliação inicial da condição
    2. Objetivos do tratamento
    3. Exercícios específicos com progressão
    4. Frequência e intensidade das sessões
    5. Precauções e contraindicações
    6. Critérios para progressão
    7. Orientações domiciliares
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
      throw new Error(data.error?.message || 'Erro ao gerar plano de reabilitação');
    }

    // Processa a resposta da IA para estruturar o plano de reabilitação
    const rehabPlan = processRehabPlanResponse(data.choices[0].message.content);

    return new Response(
      JSON.stringify(rehabPlan),
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

function processRehabPlanResponse(content: string) {
  try {
    const plan = JSON.parse(content);
    return plan;
  } catch (error) {
    console.error("Erro ao processar resposta da IA:", error);
    return {
      error: "Erro ao processar a resposta do modelo de IA."
    };
  }
}
