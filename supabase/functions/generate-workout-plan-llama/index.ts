
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LLAMA_API_KEY = Deno.env.get("LLAMA_API_KEY")!;

const LLAMA_API_URL = "https://api.llama-api.com/v1/chat/completions";

interface WorkoutPreferences {
  age: number;
  gender: string;
  weight: number;
  height: number;
  goal: string;
  activityLevel: string;
  preferredExercises: string[];
  healthConditions?: string[];
  trainingLocation: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { preferences, userId } = await req.json();

    if (!preferences || !userId) {
      return new Response(
        JSON.stringify({ error: "Preferências ou ID do usuário não fornecidos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Recuperar as configurações do modelo
    const { data: settings, error: settingsError } = await supabase
      .from('ai_model_settings')
      .select('*')
      .eq('name', 'trene2025')
      .maybeSingle();

    if (settingsError) {
      console.error("Erro ao buscar configurações:", settingsError);
      throw new Error("Erro ao buscar configurações do modelo");
    }

    const systemPrompt = settings?.use_custom_prompt && settings?.system_prompt 
      ? settings.system_prompt 
      : `Você é TRENE2025, um treinador profissional especializado em criar planos de treino personalizados.
         Crie um plano de treino completo e detalhado com base nas informações do usuário.
         O plano deve ter 3-5 dias de treino por semana, com cada dia focando em grupos musculares específicos.
         Inclua séries, repetições, descanso e orientações detalhadas para cada exercício.`;

    // Construir o prompt para o Llama 3
    const content = `
    Crie um plano de treino personalizado com as seguintes informações:
    
    Idade: ${preferences.age}
    Gênero: ${preferences.gender}
    Peso: ${preferences.weight}kg
    Altura: ${preferences.height}cm
    Objetivo: ${preferences.goal}
    Nível de atividade: ${preferences.activityLevel}
    Exercícios preferidos: ${preferences.preferredExercises.join(', ')}
    ${preferences.healthConditions?.length ? `Condições de saúde: ${preferences.healthConditions.join(', ')}` : ''}
    Local de treino: ${preferences.trainingLocation}
    
    Estruture o plano no seguinte formato JSON:
    {
      "goal": "objetivo do plano",
      "duration_weeks": 4,
      "sessions_per_week": 4,
      "overview": "visão geral do plano",
      "recommendations": ["recomendação 1", "recomendação 2"],
      "sessions": [
        {
          "day_number": 1,
          "focus": "foco do treino",
          "warmup_description": "descrição do aquecimento",
          "cooldown_description": "descrição do relaxamento",
          "exercises": [
            {
              "name": "nome do exercício",
              "sets": 3,
              "reps": 12,
              "rest_time_seconds": 60,
              "description": "descrição do exercício",
              "muscle_group": "grupo muscular",
              "tips": ["dica 1", "dica 2"]
            }
          ]
        }
      ]
    }
    `;

    // Fazer a requisição para a API do Llama
    console.log("Enviando requisição para o Llama 3...");
    const llamaResponse = await fetch(LLAMA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (!llamaResponse.ok) {
      const errorData = await llamaResponse.text();
      console.error("Erro na API Llama:", errorData);
      throw new Error(`Erro na API Llama: ${llamaResponse.status} ${errorData}`);
    }

    const llamaData = await llamaResponse.json();
    console.log("Resposta recebida da API Llama");

    // Extrair conteúdo da resposta do Llama
    let responseContent = llamaData.choices[0].message.content;
    
    // Tenta extrair apenas o JSON da resposta (caso o modelo retorne texto adicional)
    try {
      const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                         responseContent.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        responseContent = jsonMatch[0].replace(/```json|```/g, '').trim();
      }
      
      // Parsear o JSON
      const workoutPlan = JSON.parse(responseContent);
      
      // Salvar o plano de treino no banco de dados
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          user_id: userId,
          goal: workoutPlan.goal,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + workoutPlan.duration_weeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .select()
        .single();

      if (planError) {
        console.error("Erro ao salvar plano:", planError);
        throw new Error("Erro ao salvar plano de treino");
      }

      // Salvar as sessões de treino
      for (const session of workoutPlan.sessions) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert({
            plan_id: planData.id,
            day_number: session.day_number,
            warmup_description: session.warmup_description,
            cooldown_description: session.cooldown_description
          })
          .select()
          .single();

        if (sessionError) {
          console.error("Erro ao salvar sessão:", sessionError);
          continue;
        }

        // Salvar os exercícios de cada sessão
        for (const [index, exercise] of session.exercises.entries()) {
          await supabase
            .from('session_exercises')
            .insert({
              session_id: sessionData.id,
              exercise_id: null, // Como são exercícios genéricos, não temos ID
              sets: exercise.sets,
              reps: exercise.reps,
              rest_time_seconds: exercise.rest_time_seconds,
              order_in_session: index + 1
            });
        }
      }

      return new Response(
        JSON.stringify(workoutPlan),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (jsonError) {
      console.error("Erro ao processar resposta JSON:", jsonError, responseContent);
      throw new Error("Resposta do modelo não está no formato JSON esperado");
    }
  } catch (error) {
    console.error("Erro na função Edge:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao gerar plano de treino" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
