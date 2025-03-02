
// If this file exists but its content is not shown, I'll provide a generic example that works with model selection
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const groqApiKey = Deno.env.get('GROQ_API_KEY');

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
    const { message, history, model = "llama3-8b-8192" } = await req.json();
    
    // Validate model parameter
    const validModels = ["llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768"];
    const selectedModel = validModels.includes(model) ? model : "llama3-8b-8192";
    
    console.log(`Using Groq model: ${selectedModel}`);

    // Format the conversation history for the API
    const messages = history ? [...history] : [];
    messages.push({ role: "user", content: message });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Groq API error:', data);
      throw new Error(data.error?.message || 'Error from Groq API');
    }

    const aiResponse = data.choices && data.choices[0]?.message?.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
