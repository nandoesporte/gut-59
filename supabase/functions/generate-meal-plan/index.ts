
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const WEEK_DAYS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo"
];

const MEASUREMENT_GUIDELINES = `
Use SEMPRE as seguintes unidades de medida ao descrever porções:

1. Medidas Básicas:
- Gramas (g) para sólidos: "100g de frango"
- Mililitros (ml) para líquidos: "200ml de leite"
- Xícaras (xíc) para volumes: "1 xíc de arroz cozido"

2. Colheres:
- Colher de sopa (cs): "2 cs de azeite"
- Colher de chá (cc): "1 cc de sal"

3. Unidades e Porções:
- Unidades inteiras: "1 ovo", "1 maçã"
- Fatias: "2 fatias de pão integral"
- Porções: "1 porção média de arroz"

4. Quantidades Aproximadas:
- Tamanhos: "porção pequena/média/grande"
- Punhado: "1 punhado de castanhas"
- Pedaço: "1 pedaço médio de queijo"

5. Preparação:
- Especificar sempre o modo: "cru", "cozido", "grelhado", "assado", "refogado"

6. Proporções:
- Usar frações claras: "metade", "um quarto", "três quartos"

7. Cortes:
- Especificar o tipo: "em cubos", "fatias finas", "ralado"

8. Bebidas:
- Copo (200-250ml)
- Garrafa (especificar ml)

IMPORTANTE: Sempre especifique o modo de preparo e o tamanho/quantidade exata dos alimentos.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();

    if (!userData || !selectedFoods || !dietaryPreferences) {
      throw new Error('Dados incompletos para geração do plano');
    }

    console.log('Buscando prompt ativo mais recente...');
    const { data: promptData, error: promptError } = await supabase
      .from('ai_agent_prompts')
      .select('*')
      .eq('agent_type', 'meal_plan')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (promptError) {
      console.error('Erro ao buscar prompt:', promptError);
      throw new Error('Erro ao buscar prompt: ' + promptError.message);
    }
    
    if (!promptData) {
      console.error('Nenhum prompt ativo encontrado');
      throw new Error('Nenhum prompt ativo encontrado para geração de plano alimentar');
    }

    console.log('Prompt encontrado:', promptData.name);
    const basePrompt = promptData.prompt;

    const prompt = `${basePrompt}

${MEASUREMENT_GUIDELINES}

IMPORTANTE: Você DEVE gerar um cardápio diferente para CADA DIA DA SEMANA e retornar APENAS um objeto JSON válido com a seguinte estrutura:

{
  "weeklyPlan": {
    "monday": {
      "dayName": "Segunda-feira",
      "meals": {
        "breakfast": {
          "description": string,
          "foods": Array<{ name: string, portion: number, unit: string, details?: string }>,
          "calories": number,
          "macros": { protein: number, carbs: number, fats: number, fiber: number }
        },
        "morningSnack": { ... mesmo formato do café da manhã },
        "lunch": { ... mesmo formato do café da manhã },
        "afternoonSnack": { ... mesmo formato do café da manhã },
        "dinner": { ... mesmo formato do café da manhã }
      },
      "dailyTotals": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fats": number,
        "fiber": number
      }
    },
    "tuesday": { ... mesmo formato de segunda-feira },
    "wednesday": { ... mesmo formato de segunda-feira },
    "thursday": { ... mesmo formato de segunda-feira },
    "friday": { ... mesmo formato de segunda-feira },
    "saturday": { ... mesmo formato de segunda-feira },
    "sunday": { ... mesmo formato de segunda-feira }
  },
  "weeklyTotals": {
    "averageCalories": number,
    "averageProtein": number,
    "averageCarbs": number,
    "averageFats": number,
    "averageFiber": number
  },
  "recommendations": {
    "general": string,
    "preworkout": string,
    "postworkout": string,
    "timing": string[]
  }
}

REGRAS IMPORTANTES:
1. Gere um cardápio DIFERENTE para cada dia da semana
2. Mantenha as calorias e macronutrientes dentro das metas diárias
3. Varie os alimentos para garantir diversidade nutricional
4. Considere a rotina do usuário em cada dia da semana
5. Use as unidades de medida especificadas acima
6. NÃO repita as mesmas refeições em dias consecutivos

NÃO inclua nenhum texto adicional, markdown ou explicações. Retorne APENAS o JSON.`;

    const modelInput = {
      userData,
      selectedFoods,
      dietaryPreferences
    };

    console.log('Fazendo chamada para OpenAI...');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: JSON.stringify(modelInput)
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`Erro na API do OpenAI: ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    console.log('Processando resposta da OpenAI...');
    const aiResponse = await response.json();
    let mealPlan;

    try {
      console.log('Raw AI response:', aiResponse.choices[0].message.content);
      
      const content = aiResponse.choices[0].message.content.trim();
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      const jsonStr = content.slice(jsonStart, jsonEnd);
      
      mealPlan = JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw AI response:', aiResponse.choices[0].message.content);
      throw new Error('A resposta da IA não está no formato JSON esperado');
    }

    if (!mealPlan || !mealPlan.weeklyPlan) {
      console.error('Invalid meal plan structure:', mealPlan);
      throw new Error('Plano alimentar gerado com estrutura inválida');
    }

    return new Response(JSON.stringify({ mealPlan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-meal-plan:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno ao gerar plano alimentar',
        details: error.stack
      }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
