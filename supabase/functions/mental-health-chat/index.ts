
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.37.0';

// Get API keys and URLs from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { message, history } = await req.json();

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
      // Fall back to default prompt if there's an error
      const systemPrompt = "Você é um assistente de saúde mental empático e compreensivo. Forneça apoio e orientação baseados em práticas de saúde mental cientificamente validadas. Enfatize sempre a importância de buscar ajuda profissional para questões sérias de saúde mental. Nunca ofereça conselhos médicos ou diagnósticos.";
      return processOpenAIRequest(message, history, systemPrompt);
    }

    const systemPrompt = promptData?.prompt || "Você é um assistente de saúde mental empático e compreensivo.";
    return processOpenAIRequest(message, history, systemPrompt);

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar solicitação' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function processOpenAIRequest(userMessage: string, history: Message[], systemPrompt: string) {
  // Build the conversation messages for the API
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history, but filter out the initial greeting if it exists
  // and limit to the last 10 messages to avoid token limits
  const filteredHistory = history
    .filter((msg, index) => !(index === 0 && msg.role === "assistant" && msg.content.includes("Olá")))
    .slice(-10);
  
  messages.push(...filteredHistory);
  
  // Add the new user message
  messages.push({ role: "user", content: userMessage });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Error from OpenAI API');
    }

    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao comunicar com o serviço de IA',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
