
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseClient } from "../_shared/supabase-client.ts";

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
    const { preferences, userId } = await req.json();
    
    console.log("Gerando plano de fisioterapia com Fisio+ (llama3-8b-8192 via Groq)");
    console.log("Preferências:", JSON.stringify(preferences));
    
    if (!preferences) {
      throw new Error("Dados insuficientes para gerar o plano de fisioterapia");
    }

    // Format the user preferences and injury data for the prompt
    const painLevel = preferences.painLevel ? `Nível de dor: ${preferences.painLevel}/10` : 'Nível de dor não informado';
    const injuryDescription = preferences.injuryDescription ? 
      `Descrição da lesão: ${preferences.injuryDescription}` : 
      'Descrição da lesão não informada';
    
    const painLocation = preferences.painLocation ?
      `Localização da dor: ${preferences.painLocation}` :
      'Localização da dor não informada';
      
    const injuryDuration = preferences.injuryDuration ?
      `Duração da lesão: ${preferences.injuryDuration}` :
      'Duração da lesão não informada';
      
    const previousTreatments = preferences.previousTreatments ?
      `Tratamentos anteriores: ${preferences.previousTreatments}` :
      'Sem tratamentos anteriores informados';
      
    const exerciseExperience = preferences.exerciseExperience ?
      `Experiência com exercícios: ${preferences.exerciseExperience}` :
      'Experiência com exercícios não informada';
      
    const equipmentAvailable = preferences.equipmentAvailable && preferences.equipmentAvailable.length > 0 ?
      `Equipamentos disponíveis: ${preferences.equipmentAvailable.join(', ')}` :
      'Sem equipamentos disponíveis';

    // Fetch agent prompt for Fisio+
    const supabase = supabaseClient();
    const { data: agentPrompt, error: promptError } = await supabase
      .from('ai_agent_prompts')
      .select('*')
      .eq('agent_name', 'fisio-plus')
      .maybeSingle();

    if (promptError) {
      console.error("Erro ao buscar prompt do agente:", promptError);
      throw new Error("Erro ao buscar configurações do agente Fisio+");
    }

    // Use default prompt if no custom prompt is found
    const systemPrompt = agentPrompt?.system_prompt || `Você é Fisio+, um assistente especializado em fisioterapia 
    que cria planos de reabilitação personalizados com foco em exercícios terapêuticos baseados nas necessidades específicas do paciente.`;
    
    const userPrompt = `
# Informações da Lesão
- ${painLocation}
- ${painLevel}
- ${injuryDescription}
- ${injuryDuration}
- ${previousTreatments}

# Experiência e Recursos
- ${exerciseExperience}
- ${equipmentAvailable}

Crie um plano de reabilitação física de 4 semanas incluindo:
1. Exercícios diários específicos para cada semana
2. Progressão adequada de dificuldade
3. Tempo de descanso entre exercícios
4. Número de séries e repetições para cada exercício
5. Descrições detalhadas de como realizar os exercícios com segurança

Inclua também:
1. Recomendações gerais para recuperação
2. Cuidados a serem tomados durante exercícios
3. Sinais de alerta para interromper os exercícios
4. Técnicas de gerenciamento de dor

Responda com um objeto JSON seguindo este formato:
{
  "overview": {
    "title": string,
    "recommendations": [string],
    "pain_management": [string],
    "warning_signs": [string]
  },
  "days": {
    "day1": {
      "focus": string,
      "notes": string,
      "exercises": [
        {
          "name": string,
          "sets": number,
          "reps": string,
          "rest_time_seconds": number,
          "description": string,
          "tips": [string]
        }
      ]
    },
    "day2": {},
    "day3": {},
    "day4": {},
    "day5": {},
    "day6": {},
    "day7": {}
  }
}`;

    console.log("Enviando prompt para o modelo llama3-8b-8192 via Groq");

    // Call Groq API to generate the rehabilitation plan
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 4096,
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na chamada da API do Groq (${response.status}):`, errorText);
      throw new Error(`Erro na API: ${response.status} ${errorText}`);
    }

    const groqResponse = await response.json();
    console.log("Resposta recebida da API do Groq");

    if (!groqResponse.choices || !groqResponse.choices[0] || !groqResponse.choices[0].message) {
      console.error("Formato de resposta inesperado:", groqResponse);
      throw new Error("Formato de resposta inesperado");
    }

    let rehabPlanJson = groqResponse.choices[0].message.content;
    console.log("Conteúdo da resposta:", rehabPlanJson);

    // Try to parse the JSON response
    let rehabPlan;
    try {
      // First, check if the response is already a string or if it's an object
      if (typeof rehabPlanJson === 'string') {
        // Clean up the response if it contains markdown code blocks
        if (rehabPlanJson.includes('```json')) {
          rehabPlanJson = rehabPlanJson.replace(/```json\n|\n```/g, '');
        }
        
        rehabPlan = JSON.parse(rehabPlanJson);
      } else if (typeof rehabPlanJson === 'object') {
        rehabPlan = rehabPlanJson;
      } else {
        throw new Error("Formato de resposta inválido");
      }
    } catch (parseError) {
      console.error("Erro ao analisar JSON:", parseError);
      console.error("Conteúdo JSON problemático:", rehabPlanJson);
      throw new Error("Erro ao processar resposta: " + parseError.message);
    }

    // Save the rehabilitation plan to the database if user is authenticated
    if (userId) {
      const supabase = supabaseClient();
      
      // Save the rehab plan
      const { error: insertError } = await supabase
        .from('rehab_plans')
        .insert({
          user_id: userId,
          plan_data: rehabPlan,
          injury_info: {
            pain_location: preferences.painLocation,
            pain_level: preferences.painLevel,
            injury_description: preferences.injuryDescription,
            injury_duration: preferences.injuryDuration,
            previous_treatments: preferences.previousTreatments
          }
        });

      if (insertError) {
        console.error("Erro ao salvar plano de reabilitação:", insertError);
      } else {
        console.log("Plano de reabilitação salvo com sucesso!");
      
        // Update the plan generation count
        const now = new Date().toISOString();
        const { data: planCount, error: countError } = await supabase
          .from('plan_generation_counts')
          .select('count, last_reset_date')
          .eq('user_id', userId)
          .eq('plan_type', 'rehab_plan')
          .maybeSingle();
          
        if (countError) {
          console.error("Erro ao verificar contagem de planos:", countError);
        }
        
        if (planCount) {
          await supabase
            .from('plan_generation_counts')
            .update({
              count: planCount.count + 1,
              last_generated_date: now
            })
            .eq('user_id', userId)
            .eq('plan_type', 'rehab_plan');
        } else {
          await supabase
            .from('plan_generation_counts')
            .insert({
              user_id: userId,
              plan_type: 'rehab_plan',
              count: 1,
              last_generated_date: now,
              last_reset_date: now
            });
        }
      }
    }

    return new Response(
      JSON.stringify(rehabPlan),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erro completo:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Ocorreu um erro ao gerar o plano de reabilitação"
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
