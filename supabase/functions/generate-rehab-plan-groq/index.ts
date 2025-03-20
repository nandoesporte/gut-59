
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

// CORS headers for browser compatibility
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
    
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    console.log('Gerando plano de reabilitação para usuário:', userId);
    console.log('Preferências recebidas:', JSON.stringify(preferences));

    // Create a Supabase client with the Admin key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the user exists - this check is just to ensure valid inputs but allows any authenticated user
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Erro ao verificar usuário:', userError);
      if (userError.code === 'PGRST116') {
        throw new Error('Usuário não encontrado');
      }
      throw new Error('Erro ao verificar usuário');
    }

    // Fetch physio exercises for the specific condition and joint area
    const { data: exercises, error: exercisesError } = await supabase
      .from('physio_exercises')
      .select('*')
      .eq('condition', preferences.condition)
      .eq('joint_area', preferences.joint_area);

    if (exercisesError || !exercises || exercises.length === 0) {
      console.error('Erro ao buscar exercícios:', exercisesError);
      throw new Error('Não foram encontrados exercícios adequados para essa condição');
    }

    console.log(`Encontrados ${exercises.length} exercícios para condição ${preferences.condition} na área ${preferences.joint_area}`);

    if (!GROQ_API_KEY) {
      throw new Error('GROQ API key não configurada');
    }

    // Generate a rehab plan using GROQ
    const uniqueExercises = [...new Map(exercises.map(item => [item.id, item])).values()];
    const safeExercises = uniqueExercises.slice(0, 20); // Limit to 20 exercises to avoid token limits

    const exercisesDescription = safeExercises.map(ex => {
      return `ID: ${ex.id}, Nome: ${ex.name}, Descrição: ${ex.description || 'Não disponível'}, Tipo: ${ex.exercise_type}, Dificuldade: ${ex.difficulty}, Sets recomendados: ${ex.recommended_sets || 3}, Repetições recomendadas: ${ex.recommended_repetitions || 10}`;
    }).join('\n\n');

    // Build the system prompt
    const systemPrompt = `Você é um fisioterapeuta especializado que criará um plano de reabilitação personalizado. 
    Formate sua resposta em JSON.
    
    O plano deve ser adequado para a condição específica do paciente e considerar seu objetivo. 
    Inclua exercícios organizados em 3-4 dias por semana para 3-4 semanas, com foco progressivo.
    
    Para cada sessão, inclua 5-7 exercícios da lista fornecida, com aquecimento e resfriamento apropriados.
    
    IMPORTANTE: Use apenas exercícios da lista fornecida. NÃO INVENTE NOVOS EXERCÍCIOS.
    Escreva todas as descrições em português brasileiro.
    Certifique-se que todos os termos como "aquecimento", "volta à calma", etc. estejam em português.`;

    // Build the user prompt
    const userPrompt = `Crie um plano de reabilitação para um paciente com ${preferences.condition} na área ${preferences.joint_area}, 
    com objetivo principal de ${preferences.goal}.
    
    Idade: ${preferences.age || 'Não informada'}
    Peso: ${preferences.weight || 'Não informado'} kg
    Altura: ${preferences.height || 'Não informada'} cm
    
    O plano deve ter duração de 3-4 semanas, com 3-4 sessões por semana.
    
    Aqui estão os exercícios disponíveis para usar (use apenas estes, não invente novos):
    
    ${exercisesDescription}
    
    Formate sua resposta como um objeto JSON válido com os seguintes campos:
    
    {
      "overview": "Visão geral do plano e recomendações gerais",
      "recommendations": ["Recomendação 1", "Recomendação 2", ...],
      "days": {
        "day1": {
          "focus": "Foco do dia",
          "exercises": [
            {"id": "id do exercício", "sets": 3, "reps": 10, "rest_seconds": 60}
          ],
          "warmup_description": "Descrição do aquecimento (EM PORTUGUÊS)",
          "cooldown_description": "Descrição da volta à calma (EM PORTUGUÊS)"
        },
        ...mais dias
      }
    }
    
    IMPORTANTE: Certifique-se de que o JSON esteja válido e completo.
    Certifique-se que aquecimento e resfriamento estejam SEMPRE em português.`;

    console.log('Enviando requisição para a Groq API...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta da Groq API:', errorText);
      throw new Error(`Erro na API Groq: ${response.status} - ${errorText}`);
    }

    const groqData = await response.json();
    console.log('Resposta recebida da Groq API');

    let generatedPlan;
    try {
      const contentText = groqData.choices[0].message.content;
      
      // Extract JSON from the response if needed
      const jsonMatch = contentText.match(/```json\s*([\s\S]*?)\s*```/) || 
                        contentText.match(/{[\s\S]*}/);
      
      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : contentText;
      generatedPlan = JSON.parse(jsonText);
      
      console.log('Plano de reabilitação gerado com sucesso');
    } catch (parseError) {
      console.error('Erro ao analisar JSON da resposta:', parseError);
      console.error('Conteúdo que causou erro:', groqData.choices[0].message.content);
      throw new Error('Erro ao processar resposta da IA. Por favor, tente novamente.');
    }

    // Create a new rehab plan in the database
    const planId = crypto.randomUUID();
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 28); // 4 weeks

    const { error: insertError } = await supabase
      .from('rehab_plans')
      .insert({
        id: planId,
        user_id: userId,
        goal: preferences.goal,
        condition: preferences.condition,
        joint_area: preferences.joint_area,
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        plan_data: generatedPlan
      });

    if (insertError) {
      console.error('Erro ao salvar plano de reabilitação:', insertError);
      throw new Error(`Erro ao salvar plano: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify(generatedPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro durante a geração do plano de reabilitação:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar plano de reabilitação'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
