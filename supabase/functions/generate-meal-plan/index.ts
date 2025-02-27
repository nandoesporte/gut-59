import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    
    console.log('Gerando plano alimentar para:', userData);
    console.log('Preferências dietéticas:', dietaryPreferences);

    const systemPrompt = `Você é um especialista em nutrição. Gere um plano alimentar semanal detalhado baseado nas seguintes informações:
    - Objetivo: ${userData.goal}
    - Calorias diárias: ${userData.dailyCalories}
    - Preferências alimentares e restrições fornecidas
    - Use apenas os alimentos da lista fornecida`;

    const prompt = `
    Dados do usuário:
    - Peso: ${userData.weight}kg
    - Altura: ${userData.height}cm
    - Idade: ${userData.age}
    - Gênero: ${userData.gender}
    - Nível de atividade: ${userData.activityLevel}
    - Objetivo: ${userData.goal}
    - Calorias diárias calculadas: ${userData.dailyCalories}

    Preferências dietéticas:
    ${JSON.stringify(dietaryPreferences, null, 2)}

    Alimentos disponíveis:
    ${JSON.stringify(selectedFoods, null, 2)}

    Por favor, gere um plano alimentar semanal completo que inclua:
    1. Refeições diárias (café da manhã, lanche da manhã, almoço, lanche da tarde, jantar)
    2. Porções específicas de cada alimento
    3. Calorias e macronutrientes por refeição
    4. Totais diários
    5. Recomendações gerais
    6. Instruções para pré e pós-treino se houver horário de treino especificado
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro ao gerar plano alimentar');
    }

    // Processa a resposta da IA para estruturar o plano alimentar
    const mealPlan = processMealPlanResponse(data.choices[0].message.content);

    return new Response(
      JSON.stringify({ mealPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function processMealPlanResponse(content: string) {
    try {
        const mealPlan = {
            weeklyPlan: {
                monday: parseDayPlan(content, "Monday"),
                tuesday: parseDayPlan(content, "Tuesday"),
                wednesday: parseDayPlan(content, "Wednesday"),
                thursday: parseDayPlan(content, "Thursday"),
                friday: parseDayPlan(content, "Friday"),
                saturday: parseDayPlan(content, "Saturday"),
                sunday: parseDayPlan(content, "Sunday"),
            },
            weeklyTotals: calculateWeeklyTotals(content),
            recommendations: parseRecommendations(content)
        };
        return mealPlan;
    } catch (error) {
        console.error("Erro ao processar resposta:", error);
        return null;
    }
}

function parseDayPlan(content: string, dayName: string) {
    const dayRegex = new RegExp(`${dayName}:\\s*([\\s\\S]*?)(?:${getFollowingDayRegex(dayName)}|$)`, 'i');
    const dayMatch = content.match(dayRegex);

    if (!dayMatch || !dayMatch[1]) {
        console.log(`Plano para ${dayName} não encontrado.`);
        return {
            dayName: dayName,
            meals: {
                breakfast: null,
                morningSnack: null,
                lunch: null,
                afternoonSnack: null,
                dinner: null
            },
            dailyTotals: null
        };
    }

    const dayContent = dayMatch[1];

    return {
        dayName: dayName,
        meals: {
            breakfast: parseMeal(dayContent, "Breakfast"),
            morningSnack: parseMeal(dayContent, "Morning Snack"),
            lunch: parseMeal(dayContent, "Lunch"),
            afternoonSnack: parseMeal(dayContent, "Afternoon Snack"),
            dinner: parseMeal(dayContent, "Dinner")
        },
        dailyTotals: parseDailyTotals(dayContent)
    };
}

function getFollowingDayRegex(dayName: string) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const currentIndex = days.indexOf(dayName);
    const nextDay = days[(currentIndex + 1) % 7];
    return nextDay ? `${nextDay}:` : '';
}

function parseMeal(dayContent: string, mealName: string) {
    const mealRegex = new RegExp(`${mealName}:\\s*([\\s\\S]*?)(?:\\n(?:Morning Snack|Lunch|Afternoon Snack|Dinner|Daily Totals)|$)`, 'i');
    const mealMatch = dayContent.match(mealRegex);

    if (!mealMatch || !mealMatch[1]) {
        return null;
    }

    const mealContent = mealMatch[1].trim();
    const foods = parseFoods(mealContent);
    const calories = foods.reduce((sum, food) => sum + food.calories, 0);
    const macros = calculateMacros(foods);

    return {
        description: mealContent,
        foods: foods,
        calories: calories,
        macros: macros
    };
}

function parseFoods(mealContent: string) {
    const foodRegex = /•\s*([^\n]+)/g;
    let match;
    const foods = [];

    while ((match = foodRegex.exec(mealContent)) !== null) {
        const foodText = match[1].trim();
        const [portion, unit, ...nameParts] = foodText.split(/\s+/);
        const name = nameParts.join(' ').replace(/de\s+$/, '').trim();
        const calories = extractCalories(foodText);

        foods.push({
            name: name,
            portion: parseFloat(portion),
            unit: unit,
            details: '',
            calories: calories
        });
    }

    return foods;
}

function extractCalories(foodText: string) {
    const calorieRegex = /(\d+)\s*kcal/i;
    const calorieMatch = foodText.match(calorieRegex);
    return calorieMatch ? parseFloat(calorieMatch[1]) : 0;
}

function calculateMacros(foods: any[]) {
    let protein = 0;
    let carbs = 0;
    let fats = 0;
    let fiber = 0;

    foods.forEach(food => {
        protein += extractMacro(food.name, 'protein');
        carbs += extractMacro(food.name, 'carbs');
        fats += extractMacro(food.name, 'fats');
        fiber += extractMacro(food.name, 'fiber');
    });

    return {
        protein: protein,
        carbs: carbs,
        fats: fats,
        fiber: fiber
    };
}

function extractMacro(foodText: string, macro: string) {
    const macroRegex = new RegExp(`${macro}:\\s*(\\d+)g`, 'i');
    const macroMatch = foodText.match(macroRegex);
    return macroMatch ? parseFloat(macroMatch[1]) : 0;
}

function parseDailyTotals(dayContent: string) {
    const totalsRegex = /Daily Totals:\s*([\s\S]*)$/i;
    const totalsMatch = dayContent.match(totalsRegex);

    if (!totalsMatch || !totalsMatch[1]) {
        return null;
    }

    const totalsContent = totalsMatch[1];
    const caloriesRegex = /Calories:\s*(\d+)\s*kcal/i;
    const proteinRegex = /Protein:\s*(\d+)\s*g/i;
    const carbsRegex = /Carbs:\s*(\d+)\s*g/i;
    const fatsRegex = /Fats:\s*(\d+)\s*g/i;
    const fiberRegex = /Fiber:\s*(\d+)\s*g/i;

    const caloriesMatch = totalsContent.match(caloriesRegex);
    const proteinMatch = totalsContent.match(proteinRegex);
    const carbsMatch = totalsContent.match(carbsRegex);
    const fatsMatch = totalsContent.match(fatsRegex);
    const fiberMatch = totalsContent.match(fiberRegex);

    return {
        calories: caloriesMatch ? parseFloat(caloriesMatch[1]) : 0,
        protein: proteinMatch ? parseFloat(proteinMatch[1]) : 0,
        carbs: carbsMatch ? parseFloat(carbsMatch[1]) : 0,
        fats: fatsMatch ? parseFloat(fatsMatch[1]) : 0,
        fiber: fiberMatch ? parseFloat(fiberMatch[1]) : 0
    };
}

function calculateWeeklyTotals(content: string) {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    let totalFiber = 0;

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    days.forEach(day => {
        const dayRegex = new RegExp(`${day}:\\s*([\\s\\S]*?)(?:${getFollowingDayRegex(day)}|$)`, 'i');
        const dayMatch = content.match(dayRegex);

        if (dayMatch && dayMatch[1]) {
            const dayContent = dayMatch[1];
            const dailyTotals = parseDailyTotals(dayContent);

            if (dailyTotals) {
                totalCalories += dailyTotals.calories;
                totalProtein += dailyTotals.protein;
                totalCarbs += dailyTotals.carbs;
                totalFats += dailyTotals.fats;
                totalFiber += dailyTotals.fiber;
            }
        }
    });

    const numberOfDays = days.length;

    return {
        averageCalories: totalCalories / numberOfDays,
        averageProtein: totalProtein / numberOfDays,
        averageCarbs: totalCarbs / numberOfDays,
        averageFats: totalFats / numberOfDays,
        averageFiber: totalFiber / numberOfDays
    };
}

function parseRecommendations(content: string) {
    const generalRecommendationsRegex = /General Recommendations:\s*([^\n]+)/i;
    const preWorkoutRecommendationsRegex = /Pre-workout:\s*([^\n]+)/i;
    const postWorkoutRecommendationsRegex = /Post-workout:\s*([^\n]+)/i;
    const timingRecommendationsRegex = /Recommended Timing:\s*([^\n]+)/i;

    const generalMatch = content.match(generalRecommendationsRegex);
    const preWorkoutMatch = content.match(preWorkoutRecommendationsRegex);
    const postWorkoutMatch = content.match(postWorkoutRecommendationsRegex);
    const timingMatch = content.match(timingRecommendationsRegex);

    return {
        general: generalMatch ? generalMatch[1].trim() : '',
        preworkout: preWorkoutMatch ? preWorkoutMatch[1].trim() : '',
        postworkout: postWorkoutMatch ? postWorkoutMatch[1].trim() : '',
        timing: timingMatch ? timingMatch[1].split(',').map(item => item.trim()) : []
    };
}
