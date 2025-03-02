
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LLAMA_API_KEY = Deno.env.get("LLAMA_API_KEY");
const LLAMA_API_URL = "https://api.llama-api.com";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { prompt, model = "nous-hermes-2-mixtral-8x7b", system, temperature = 0.7, max_tokens = 2048 } = await req.json();

    console.log(`Calling Llama API with model: ${model}`);
    console.log(`Prompt: ${prompt?.substring(0, 100)}...`);
    
    // Format messages for Llama API
    const messages = [];
    
    if (system) {
      messages.push({ role: "system", content: system });
    }
    
    messages.push({ role: "user", content: prompt });

    // Make the API call to Llama
    const response = await fetch(`${LLAMA_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature,
        max_tokens: max_tokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Llama API error: ${error}`);
      throw new Error(`Llama API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log("Llama API response received successfully");

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in Llama API function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
