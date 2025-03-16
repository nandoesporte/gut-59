
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseClient } from "../_shared/supabase-client.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userData } = await req.json();
    
    console.log("Gerando plano de reabilitação com agente Fisio+");
    console.log("Dados do usuário:", JSON.stringify(userData));
    console.log("Preferências:", JSON.stringify(preferences));
    
    if (!preferences) {
      throw new Error("Dados insuficientes para gerar o plano de reabilitação");
    }

    // Criar o cliente Supabase
    const supabase = supabaseClient();

    // Buscar o prompt ativo do agente Fisio+
    const { data: promptData, error: promptError } = await supabase
      .from('ai_agent_prompts')
      .select('*')
      .eq('agent_type', 'physiotherapy')
      .eq('is_active', true)
      .single();

    if (promptError) {
      console.error("Erro ao buscar prompt do agente Fisio+:", promptError);
      throw new Error("Não foi possível encontrar o prompt do agente Fisio+");
    }

    if (!promptData) {
      throw new Error("Nenhum prompt de fisioterapia ativo encontrado");
    }

    console.log("Prompt encontrado:", promptData.name);

    // Preparar os dados do usuário para o prompt
    const painLevel = preferences.pain_level ? `Nível de dor: ${preferences.pain_level}/10` : 'Nível de dor não informado';
    const userWeight = userData?.weight || preferences.weight || 70;
    const userHeight = userData?.height || preferences.height || 170;
    const userAge = userData?.age || preferences.age || 30;
    const userGender = userData?.gender || preferences.gender || 'male';
    const jointArea = preferences.joint_area || 'knee';
    const mobilityLevel = preferences.mobility_level || 'moderate';
    const activityLevel = preferences.activity_level || 'moderate';

    // Obter o prompt base do agente Fisio+
    let promptTemplate = promptData.prompt;
    
    // Substituir variáveis no template
    const contextData = {
      user_weight: userWeight,
      user_height: userHeight,
      user_age: userAge,
      user_gender: userGender === 'male' ? 'Masculino' : 'Feminino',
      joint_area: jointArea,
      pain_level: preferences.pain_level || 5,
      mobility_level: mobilityLevel,
      activity_level: activityLevel
    };

    // Substituir variáveis no template
    Object.entries(contextData).forEach(([key, value]) => {
      promptTemplate = promptTemplate.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    console.log("Enviando prompt para o modelo llama3-8b-8192");

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
          { 
            role: "system", 
            content: "Você é um fisioterapeuta especializado em criar planos de reabilitação personalizados. Você sempre responde com JSON válido, utilizando um objeto com estrutura correta e completa, sem truncar ou usar placeholder como '...e assim por diante'."
          },
          { role: "user", content: promptTemplate }
        ],
        max_tokens: 4096,
        temperature: 0.4,
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

    // Processar a resposta JSON
    let rehabPlan;
    try {
      // Verificar se a resposta já é uma string ou se é um objeto
      if (typeof rehabPlanJson === 'string') {
        // Limpar a resposta se contiver blocos de código markdown
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

    // Salvar o plano de reabilitação no banco de dados se o usuário estiver autenticado
    if (userData?.id) {
      try {
        // Salvar o plano de reabilitação
        const { error: insertError } = await supabase
          .from('rehab_plans')
          .insert({
            user_id: userData.id,
            goal: preferences.goal || 'pain_relief',
            condition: preferences.condition,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 28 dias depois
            plan_data: rehabPlan
          });

        if (insertError) {
          console.error("Erro ao salvar plano de reabilitação:", insertError);
        } else {
          console.log("Plano de reabilitação salvo com sucesso!");
        
          // Atualizar contagem de geração de planos
          const now = new Date().toISOString();
          const { data: planCount, error: countError } = await supabase
            .from('plan_generation_counts')
            .select('count, last_reset_date')
            .eq('user_id', userData.id)
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
              .eq('user_id', userData.id)
              .eq('plan_type', 'rehab_plan');
          } else {
            await supabase
              .from('plan_generation_counts')
              .insert({
              user_id: userData.id,
              plan_type: 'rehab_plan',
              count: 1,
              last_generated_date: now,
              last_reset_date: now
            });
          }
        }
      } catch (dbError) {
        console.error("Erro ao interagir com o banco de dados:", dbError);
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
