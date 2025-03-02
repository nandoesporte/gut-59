
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
    const { message, userId, chatHistory } = await req.json();
    
    console.log("Mental Health Chat Function - Request received");
    console.log("Using model: nous-hermes-2-mixtral-8x7b");
    console.log("User ID:", userId);
    
    // Create a system prompt for mental health support
    const systemPrompt = `You are a compassionate mental health support assistant. Your role is to provide empathetic, supportive responses to users seeking mental health guidance.
    
Important guidelines:
1. Always be empathetic, kind, and supportive
2. Never diagnose medical conditions
3. Encourage professional help when appropriate
4. Provide practical coping strategies and self-care tips
5. Focus on wellness, mindfulness, and positive psychology approaches
6. Keep responses concise, supportive, and actionable

If someone expresses thoughts of self-harm or suicide, ALWAYS respond with:
"I'm concerned about what you're sharing. Please reach out to a mental health professional or crisis support immediately. You can call a crisis hotline that's available 24/7: Brasil - Centro de Valorização da Vida (CVV): 188"`;

    // Format the chat history for context
    const messages = [];
    messages.push({ role: "system", content: systemPrompt });
    
    // Add chat history for context
    if (chatHistory && chatHistory.length > 0) {
      // Add up to 10 most recent messages from history for context
      const recentHistory = chatHistory.slice(-10);
      
      recentHistory.forEach(chat => {
        if (chat.role === "user") {
          messages.push({ role: "user", content: chat.content });
        } else {
          messages.push({ role: "assistant", content: chat.content });
        }
      });
    }
    
    // Add the current message
    messages.push({ role: "user", content: message });
    
    console.log(`Processing message with ${messages.length} message context`);
    
    // Call the Llama API with the Nous-Hermes model
    const llamaResponse = await fetch(`${LLAMA_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: "nous-hermes-2-mixtral-8x7b",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048
      }),
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error("Llama API error:", errorText);
      throw new Error(`Llama API error: ${llamaResponse.status} - ${errorText}`);
    }

    const llamaData = await llamaResponse.json();
    console.log("Llama API response received");
    
    const responseMessage = llamaData.choices[0].message.content;
    console.log("Response generated successfully");
    
    return new Response(JSON.stringify({ 
      response: responseMessage,
      model: "nous-hermes-2-mixtral-8x7b"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in mental-health-chat function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
