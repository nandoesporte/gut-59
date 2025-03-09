
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseClient } from "../_shared/supabase-client.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

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
    const { count = 30, theme } = await req.json();
    
    console.log(`Gerando ${count} desafios diários com o tema: ${theme || 'variado'}`);
    
    const themes = [
      'saúde', 'produtividade', 'bem-estar', 'curiosidades'
    ];
    
    // Format the prompt for the challenge generation
    const prompt = `
    # Instrução
    Crie uma lista de ${count} desafios diários curtos e motivacionais para um aplicativo de saúde e bem-estar.
    
    ## Diretrizes
    - Cada desafio deve ser conciso (máximo 120 caracteres)
    - Inclua uma variedade de categorias: ${themes.join(', ')}
    - Os desafios devem ser práticos e realizáveis em um dia
    - Evite desafios que exijam equipamentos específicos
    - Use linguagem positiva e motivacional
    - Escreva em português do Brasil
    - Cada desafio deve ter uma categoria associada dentre as listadas
    
    ## Formato de Resposta
    Responda APENAS com um array JSON com a seguinte estrutura:
    [
      {
        "content": "Texto do desafio 1",
        "theme": "categoria do desafio"
      },
      {
        "content": "Texto do desafio 2",
        "theme": "categoria do desafio"
      },
      ...
    ]
    
    Certifique-se de que o JSON seja válido.
    `;

    console.log("Enviando prompt para o modelo llama3-8b-8192 via Groq");

    // Call Groq API to generate the challenges
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { 
            role: "system", 
            content: "Você é um especialista em criar desafios motivacionais para aplicativos de saúde e bem-estar. Você sempre responde com JSON válido, sem explicações ou texto adicional."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na chamada da API do Groq (${response.status}):`, errorText);
      throw new Error(`Erro na API: ${response.status} ${errorText}`);
    }

    const groqResponse = await response.json();
    console.log("Resposta recebida da API do Groq");

    if (!groqResponse.choices || !groqResponse.choices[0] || !groqResponse.choices[0].message) {
      console.error("Formato de resposta inesperado:", groqResponse);
      throw new Error("Formato de resposta inesperado");
    }

    let challengesContent = groqResponse.choices[0].message.content;
    console.log("Conteúdo da resposta:", challengesContent);

    // Parse the challenges
    let challenges;
    try {
      // Check if the response is already a string or if it's an object
      if (typeof challengesContent === 'string') {
        // Clean up the response if it contains markdown code blocks
        if (challengesContent.includes('```json')) {
          challengesContent = challengesContent.replace(/```json\n|\n```/g, '');
        }
        
        challenges = JSON.parse(challengesContent);
      } else if (typeof challengesContent === 'object') {
        challenges = challengesContent;
      } else {
        throw new Error("Formato de resposta inválido");
      }
    } catch (parseError) {
      console.error("Erro ao analisar JSON:", parseError);
      console.error("Conteúdo JSON problemático:", challengesContent);
      throw new Error("Erro ao processar resposta: " + parseError.message);
    }

    // Save the challenges to the database if requested
    const supabase = supabaseClient();
    if (challenges && Array.isArray(challenges)) {
      console.log(`Salvando ${challenges.length} desafios no banco de dados`);
      
      // Clear existing tips if needed
      if (req.headers.get('x-clear-existing') === 'true') {
        await supabase.from('daily_tips').delete().neq('id', 0);
      }
      
      // Insert the new challenges
      const { error } = await supabase
        .from('daily_tips')
        .insert(challenges.map(challenge => ({
          content: challenge.content,
          theme: challenge.theme
        })));
        
      if (error) {
        console.error("Erro ao salvar desafios no banco de dados:", error);
      } else {
        console.log("Desafios salvos com sucesso!");
      }
    }

    return new Response(
      JSON.stringify({ challenges }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erro ao gerar desafios diários:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Ocorreu um erro ao gerar os desafios diários"
      }),
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
