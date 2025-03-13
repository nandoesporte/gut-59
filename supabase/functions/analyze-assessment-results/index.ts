
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.37.0';
import { corsHeaders } from "../_shared/cors.ts";

// Get API keys and URLs from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { assessmentData } = await req.json();
    
    if (!assessmentData) {
      throw new Error('Assessment data is required');
    }

    // Get the mental health agent prompt from the database
    const { data: promptData, error: promptError } = await supabase
      .from('ai_agent_prompts')
      .select('prompt')
      .eq('agent_type', 'mental_health')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (promptError) {
      console.error('Error fetching agent prompt:', promptError);
      throw promptError;
    }

    const systemPrompt = promptData?.prompt || 
      "Você é um assistente especializado em saúde mental. Analise os resultados desta avaliação e forneça uma interpretação profissional e empática, destacando os pontos principais e oferecendo recomendações personalizadas.";

    // Format the assessment data for the AI
    const assessmentType = assessmentData.assessment_type;
    const score = assessmentData.score;
    const responses = assessmentData.responses;
    
    // Create a user message with the assessment details
    const userMessage = `
      Por favor, analise os seguintes resultados de avaliação de saúde mental:
      
      Tipo de avaliação: ${assessmentType}
      Pontuação total: ${score}
      
      Respostas específicas:
      ${JSON.stringify(responses, null, 2)}
      
      Por favor, forneça:
      1. Uma análise geral dos resultados
      2. Pontos específicos de atenção
      3. Recomendações personalizadas
      4. Próximos passos sugeridos
      
      Mantenha um tom empático e profissional, lembrando que isso não substitui uma consulta com um profissional de saúde mental.
    `;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Error from OpenAI API');
    }

    const aiAnalysis = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ analysis: aiAnalysis }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar solicitação', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
