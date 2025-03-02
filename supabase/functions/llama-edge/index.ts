
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define CORS headers for the API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight request
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { ...corsHeaders },
      status: 204,
    });
  }
  return null;
};

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse request body
    const requestData = await req.json();
    const { prompt, model, maxTokens, temperature } = requestData;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "No prompt provided" }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          }
        }
      );
    }

    // Default model if not provided, Llama's "nous-hermes-2-mixtral-8x7b"
    const selectedModel = model || "nous-hermes-2-mixtral-8x7b";
    
    // Configure API request
    const llamaApiUrl = "https://api.llama-api.com/api/chat/completions";
    
    const apiKey = Deno.env.get("LLAMA_API_KEY");
    if (!apiKey) {
      console.error("LLAMA_API_KEY environment variable not set");
      return new Response(
        JSON.stringify({ error: "API configuration error" }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          }
        }
      );
    }

    console.log(`Calling Llama API with model: ${selectedModel}`);
    
    // Make request to Llama API
    const response = await fetch(llamaApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: "You are a helpful assistant that provides concise and accurate information." },
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens || 1000,
        temperature: temperature || 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Llama API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: `Llama API error: ${response.status}`,
          details: errorText
        }),
        { 
          status: response.status,
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          }
        }
      );
    }

    const data = await response.json();
    console.log("Llama API response:", JSON.stringify(data, null, 2).substring(0, 500) + "...");

    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    );
  }
});
