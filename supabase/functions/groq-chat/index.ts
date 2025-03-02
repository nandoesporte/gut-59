
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  message: string;
  history: Message[];
  model: string; // Now handling the model parameter
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is required");
    }

    const requestBody: RequestBody = await req.json();
    const { message, history = [], model = "llama3-70b-8192" } = requestBody;

    if (!message) {
      throw new Error("Message is required");
    }

    console.log(`Using model: ${model}`);

    // Format the conversation for the Groq API
    const messages = [
      ...history,
      { role: "user", content: message },
    ];

    // Make the request to the Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model, // Use the model specified in the request
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);
      throw new Error(`Groq API error: ${data.error?.message || "Unknown error"}`);
    }

    const assistantResponse = data.choices?.[0]?.message?.content;

    if (!assistantResponse) {
      throw new Error("No response from model");
    }

    // Return the response with CORS headers
    return new Response(
      JSON.stringify({ response: assistantResponse }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error:", error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
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
