
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Obtém o token da API Groq
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is required');
}

interface MealPlanGenerationRequest {
  userData: {
    weight: number;
    height: number;
    age: number;
    gender: string;
    activityLevel: string;
    goal: string;
    userId: string;
    dailyCalories: number;
  };
  selectedFoods: any[];
  foodsByMealType?: Record<string, any[]>;
  dietaryPreferences: {
    hasAllergies: boolean;
    allergies: string[];
    dietaryRestrictions: string[];
    trainingTime: string | null;
  };
  modelConfig: {
    model: string;
    provider: string;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar o método da requisição
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse do body da requisição
    const requestData: MealPlanGenerationRequest = await req.json();
    console.log('Request received for meal plan generation');

    // Validação básica
    if (!requestData.userData || !requestData.selectedFoods) {
      return new Response(JSON.stringify({ error: 'Invalid request data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se há alimentos selecionados
    if (requestData.selectedFoods.length === 0) {
      return new Response(JSON.stringify({ error: 'No foods selected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Criar um prompt detalhado para o Llama 3.2 1B
    const systemMessage = createMealPlanSystemMessage();
    
    // Criar o prompt do usuário com os dados necessários para o plano alimentar
    const userMessage = createMealPlanUserMessage(requestData);

    // Modelo a ser utilizado (garantindo que seja o Llama 3.2 1B)
    const model = "llama-3.2-1b-8k";

    console.log(`Usando modelo: ${model}`);
    console.log('Enviando solicitação para a API Groq...');

    // Chamada para a API Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 7000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Erro na API Groq: ${response.status}`, errorData);
      throw new Error(`API Groq error: ${response.status}`);
    }

    // Parse da resposta
    const data = await response.json();
    console.log('Resposta recebida da API Groq');

    // Extrair o conteúdo da resposta
    const content = data.choices[0].message.content;
    
    // Tentar extrair JSON do conteúdo
    let mealPlan;
    try {
      // Tentar encontrar um objeto JSON no conteúdo da resposta
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) ||
                        content.match(/{[\s\S]*}/);
                        
      let jsonContent = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      
      // Limpar qualquer texto antes ou depois do JSON
      if (jsonContent.includes('{') && jsonContent.includes('}')) {
        const startIdx = jsonContent.indexOf('{');
        const endIdx = jsonContent.lastIndexOf('}') + 1;
        jsonContent = jsonContent.substring(startIdx, endIdx);
      }
      
      console.log('Extraindo JSON da resposta do modelo');
      mealPlan = JSON.parse(jsonContent);
      
      // Garantir que o plano tenha a estrutura esperada
      if (!mealPlan.weeklyPlan || !mealPlan.recommendations) {
        console.error('Estrutura do plano alimentar inválida', mealPlan);
        throw new Error('Invalid meal plan structure');
      }
    } catch (error) {
      console.error('Erro ao analisar o JSON da resposta:', error);
      console.error('Conteúdo recebido:', content);
      throw new Error('Failed to parse meal plan from model response');
    }

    // Retornar o plano alimentar processado
    return new Response(JSON.stringify({ mealPlan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao processar a solicitação:', error);
    
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Função para criar a mensagem do sistema para o modelo
function createMealPlanSystemMessage(): string {
  return `Você é um nutricionista especializado que vai criar um plano alimentar semanal detalhado em português brasileiro.
  
  Algumas regras importantes:
  1. Você DEVE retornar APENAS um objeto JSON válido sem nenhum outro texto adicional.
  2. O JSON deve seguir EXATAMENTE o formato esperado descrito no final.
  3. Use os alimentos fornecidos pelo usuário, não invente outros.
  4. Respeite as restrições dietéticas e alergias informadas.
  5. A resposta deve ser SEMPRE em português brasileiro.
  6. Forneça um plano variado, respeitando os macros e calorias indicados.
  7. Organize os alimentos em 5 refeições: café da manhã (breakfast), lanche da manhã (morningSnack), almoço (lunch), lanche da tarde (afternoonSnack) e jantar (dinner).
  8. Distribua as calorias aproximadamente nestas porcentagens: café da manhã 25%, lanches 10% cada, almoço 35%, jantar 20%.
  9. Use medidas comuns em gramas (g) ou mililitros (ml).
  
  O formato JSON do plano alimentar deve ser exatamente assim:
  {
    "weeklyPlan": {
      "monday": {
        "dayName": "Segunda-feira",
        "meals": {
          "breakfast": {
            "foods": [
              {"name": "Nome do alimento", "portion": 100, "unit": "g", "details": "Detalhe opcional do alimento"}
            ],
            "calories": 500,
            "macros": {"protein": 30, "carbs": 40, "fats": 20, "fiber": 5},
            "description": "Descrição do café da manhã"
          },
          "morningSnack": { MESMO FORMATO DO BREAKFAST },
          "lunch": { MESMO FORMATO DO BREAKFAST },
          "afternoonSnack": { MESMO FORMATO DO BREAKFAST },
          "dinner": { MESMO FORMATO DO BREAKFAST }
        },
        "dailyTotals": {
          "calories": 2000,
          "protein": 150,
          "carbs": 200,
          "fats": 65,
          "fiber": 25
        }
      },
      "tuesday": { MESMO FORMATO DE MONDAY },
      "wednesday": { MESMO FORMATO DE MONDAY },
      "thursday": { MESMO FORMATO DE MONDAY },
      "friday": { MESMO FORMATO DE MONDAY },
      "saturday": { MESMO FORMATO DE MONDAY },
      "sunday": { MESMO FORMATO DE MONDAY }
    },
    "weeklyTotals": {
      "averageCalories": 2000,
      "averageProtein": 150,
      "averageCarbs": 200,
      "averageFats": 65,
      "averageFiber": 25
    },
    "recommendations": {
      "general": "Recomendações gerais em texto",
      "preworkout": "Recomendações pré-treino em texto",
      "postworkout": "Recomendações pós-treino em texto",
      "timing": ["Ponto 1 sobre timing das refeições", "Ponto 2 sobre timing das refeições"]
    }
  }`;
}

// Função para criar a mensagem do usuário com os dados necessários
function createMealPlanUserMessage(data: MealPlanGenerationRequest): string {
  const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = data;
  
  // Criar listas de alimentos por tipo de refeição, se disponíveis
  let foodListsByMealType = '';
  if (foodsByMealType) {
    foodListsByMealType = 'Alimentos por tipo de refeição:\n';
    
    if (foodsByMealType.breakfast && foodsByMealType.breakfast.length > 0) {
      foodListsByMealType += '- Café da manhã: ' + 
        foodsByMealType.breakfast.map(f => `${f.name} (${f.calories}kcal, P:${f.protein}g, C:${f.carbs}g, G:${f.fats}g)`).join(', ') + '\n';
    }
    
    if (foodsByMealType.lunch && foodsByMealType.lunch.length > 0) {
      foodListsByMealType += '- Almoço: ' + 
        foodsByMealType.lunch.map(f => `${f.name} (${f.calories}kcal, P:${f.protein}g, C:${f.carbs}g, G:${f.fats}g)`).join(', ') + '\n';
    }
    
    if (foodsByMealType.snack && foodsByMealType.snack.length > 0) {
      foodListsByMealType += '- Lanches: ' + 
        foodsByMealType.snack.map(f => `${f.name} (${f.calories}kcal, P:${f.protein}g, C:${f.carbs}g, G:${f.fats}g)`).join(', ') + '\n';
    }
    
    if (foodsByMealType.dinner && foodsByMealType.dinner.length > 0) {
      foodListsByMealType += '- Jantar: ' + 
        foodsByMealType.dinner.map(f => `${f.name} (${f.calories}kcal, P:${f.protein}g, C:${f.carbs}g, G:${f.fats}g)`).join(', ') + '\n';
    }
  }
  
  // Lista completa de alimentos se não houver categorização
  const foodsList = selectedFoods.map(food => 
    `- ${food.name} (${food.calories}kcal, P:${food.protein}g, C:${food.carbs}g, G:${food.fats}g)`
  ).join('\n');
  
  // Restrições e alergias
  const allergies = dietaryPreferences.hasAllergies ? 
    `Alergias: ${dietaryPreferences.allergies.join(', ')}` : 
    'Sem alergias';
  
  const restrictions = dietaryPreferences.dietaryRestrictions.length > 0 ? 
    `Restrições alimentares: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : 
    'Sem restrições específicas';
  
  // Momento do treino
  const trainingTime = dietaryPreferences.trainingTime ? 
    `Horário de treino: ${dietaryPreferences.trainingTime}` : 
    'Sem horário de treino específico';
  
  // Mapear objetivo para texto mais claro
  let goalText;
  switch (userData.goal) {
    case 'lose':
    case 'lose_weight':
      goalText = 'Perda de peso';
      break;
    case 'gain':
    case 'gain_mass':
    case 'gain_weight':
      goalText = 'Ganho de massa muscular';
      break;
    case 'maintain':
    default:
      goalText = 'Manutenção de peso';
  }
  
  // Mapear nível de atividade para texto mais claro
  let activityText;
  switch (userData.activityLevel) {
    case 'sedentary':
      activityText = 'Sedentário';
      break;
    case 'light':
      activityText = 'Levemente ativo';
      break;
    case 'moderate':
      activityText = 'Moderadamente ativo';
      break;
    case 'intense':
      activityText = 'Muito ativo';
      break;
    default:
      activityText = userData.activityLevel;
  }
  
  // Montar a mensagem completa
  return `Crie um plano alimentar semanal detalhado em português brasileiro para uma pessoa com as seguintes características:

Dados do usuário:
- Peso: ${userData.weight}kg
- Altura: ${userData.height}cm
- Idade: ${userData.age} anos
- Gênero: ${userData.gender === 'male' ? 'Masculino' : 'Feminino'}
- Nível de atividade: ${activityText}
- Objetivo: ${goalText}
- Necessidade calórica diária: ${userData.dailyCalories} kcal

Restrições e preferências:
- ${allergies}
- ${restrictions}
- ${trainingTime}

${foodListsByMealType || 'Alimentos selecionados:\n' + foodsList}

Lembre-se de:
1. Criar um plano alimentar completo para 7 dias da semana.
2. Respeitar a necessidade calórica diária de aproximadamente ${userData.dailyCalories} kcal.
3. Distribuir as calorias nas 5 refeições diárias conforme as porcentagens sugeridas.
4. Usar os alimentos listados acima, variando e combinando-os de forma equilibrada.
5. Considerar o objetivo de ${goalText} nas recomendações.
6. Incluir recomendações específicas considerando o horário de treino.
7. Retornar APENAS o JSON com o plano alimentar completo no formato exato solicitado.`;
}
