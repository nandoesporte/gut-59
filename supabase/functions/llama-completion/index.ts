import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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
    const { messages, modelParams } = await req.json();
    
    console.log('Received request with messages:', JSON.stringify(messages.slice(-1)));
    console.log('Using model params:', JSON.stringify(modelParams || {}));

    // Attempt to use Llama 3.1 8B Instant 128k first
    try {
      console.log('Attempting to use Llama 3.1 8B via Replicate API');
      const llamaCompletion = await generateWithLlama(messages, modelParams);
      
      return new Response(
        JSON.stringify({
          completion: llamaCompletion,
          model: "llama-3.1-8b-instant-128k",
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (llamaError) {
      // Log the error with Llama
      console.error("Error with Llama model:", llamaError);
      console.log("Falling back to OpenAI model");
      
      // Fallback to OpenAI
      const openaiCompletion = await generateWithOpenAI(messages, modelParams);
      
      return new Response(
        JSON.stringify({
          completion: openaiCompletion,
          model: "openai-fallback",
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error("Error in llama-completion function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateWithLlama(messages: any[], modelParams: any = {}) {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }

  const systemMessage = messages.find(msg => msg.role === 'system')?.content || '';
  const userMessages = messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = systemMessage
    ? `${systemMessage}\n\n${userMessages}\nAssistant:`
    : `${userMessages}\nAssistant:`;

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${REPLICATE_API_TOKEN}`,
    },
    body: JSON.stringify({
      version: "42a996d36aad26b635209ea19a8922cb80e196a5e97bf01cc56220996560912b",
      input: {
        prompt,
        max_tokens: modelParams.max_tokens || 1024,
        temperature: modelParams.temperature || 0.75,
        top_p: modelParams.top_p || 0.9,
        system_prompt: systemMessage || "",
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Replicate API error:", errorData);
    throw new Error(`Replicate API error: ${JSON.stringify(errorData)}`);
  }

  const prediction = await response.json();
  
  // If Replicate returns immediately
  if (prediction.output) {
    return prediction.output;
  }
  
  // Otherwise, we need to poll for the result
  const pollUrl = prediction.urls.get;
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pollResponse = await fetch(pollUrl, {
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
      },
    });
    
    if (!pollResponse.ok) {
      throw new Error(`Error polling Replicate: ${pollResponse.statusText}`);
    }
    
    const pollResult = await pollResponse.json();
    
    if (pollResult.status === "succeeded") {
      return pollResult.output;
    } else if (pollResult.status === "failed") {
      throw new Error(`Replicate processing failed: ${pollResult.error}`);
    }
    
    console.log(`Waiting for Llama completion... (Attempt ${attempts}/${maxAttempts})`);
  }
  
  throw new Error("Llama completion timed out");
}

async function generateWithOpenAI(messages: any[], modelParams: any = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: modelParams.temperature || 0.7,
      max_tokens: modelParams.max_tokens || 500,
      top_p: modelParams.top_p || 0.95,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("OpenAI API error:", errorData);
    throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
