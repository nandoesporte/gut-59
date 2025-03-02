
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  try {
    // Get the request body
    const reqBody = await req.json()
    const { message, history = [], model = "mistral-saba-24b" } = reqBody

    console.log(`Recebida solicitação para modelo: ${model}`)
    console.log(`Mensagem: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`)
    console.log(`Histórico: ${history.length} mensagens`)

    // Validate request
    if (!message) {
      return new Response(
        JSON.stringify({
          error: 'Message is required in the request body',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Format the conversation history for Groq AI
    let formattedMessages: any[] = []

    // First, add the system message to instruct the model
    formattedMessages.push({
      role: "system",
      content: `Você é um assistente de saúde mental especializado. Responda com empatia, clareza e gentileza. 
Suas respostas são para ajudar pessoas comuns a entender melhor suas questões emocionais e mentais. 
Evite termos muito técnicos e sempre priorize o bem-estar. 
Sua linguagem deve ser em Português do Brasil.
Nunca recomende medicamentos específicos, mas pode falar sobre abordagens terapêuticas.
Mantenha respostas concisas (máximo 3 parágrafos).
Se perceber uma emergência de saúde mental, sempre sugira buscar ajuda profissional imediata.`,
    })

    // Then add the conversation history
    if (history && Array.isArray(history)) {
      history.forEach((msg: Message) => {
        if (msg.role === "user" || msg.role === "assistant") {
          formattedMessages.push({
            role: msg.role,
            content: msg.content,
          })
        }
      })
    }

    // Finally add the current message
    formattedMessages.push({
      role: "user",
      content: message,
    })
    
    // Prepare the API request options
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      console.error('GROQ_API_KEY não configurada nas variáveis de ambiente')
      throw new Error('GROQ_API_KEY não configurada')
    }

    // Models available on Groq
    const validModels = ["llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768", "gemma-7b-it"];
    
    // If we need to support the Mistral model, we'll use it directly (it's one of the best models on Groq)
    let modelToUse = model;
    
    // Default to the Mistral Saba model which is excellent for this task
    if (!validModels.includes(model) && model !== "mistral-saba-24b") {
      console.log(`Modelo solicitado '${model}' não é suportado. Usando mistral-saba-24b como fallback.`);
      modelToUse = "mistral-saba-24b";
    }

    console.log(`Usando modelo: ${modelToUse}`);

    // Prepare API call
    const endpoint = `https://api.groq.com/openai/v1/chat/completions`;
    const headers = {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    };
    
    const requestBody = {
      model: modelToUse,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1500,
    };
    
    console.log(`Enviando requisição para Groq API com ${formattedMessages.length} mensagens.`);
    
    // Make request to Groq API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API do Groq: ${response.status} ${response.statusText}`);
      console.error(`Detalhes: ${errorText}`);
      throw new Error(`Erro na API do Groq: ${response.status} ${response.statusText}`);
    }

    // Parse the response
    const data = await response.json();
    console.log(`Resposta da Groq API recebida com sucesso`);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Resposta da API não contém mensagens:', data);
      throw new Error('Formato de resposta inválido da API');
    }

    // Return the response content
    const aiMessage = data.choices[0].message.content;
    console.log(`Resposta da IA: ${aiMessage.substring(0, 100)}${aiMessage.length > 100 ? '...' : ''}`);

    return new Response(
      JSON.stringify({
        response: aiMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Erro:', error.message)
    console.error('Stack trace:', error.stack)

    return new Response(
      JSON.stringify({
        error: `Erro ao processar requisição: ${error.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
