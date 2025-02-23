import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userData, selectedFoods } = await req.json()
    const { userId, dailyCalories, goal } = userData

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

    // Buscar preferências dietéticas salvas do usuário
    const { data: dietaryPrefs, error: prefsError } = await supabase
      .from('dietary_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (prefsError) {
      throw new Error('Erro ao buscar preferências dietéticas: ' + prefsError.message)
    }

    // Usar preferências salvas ou valores padrão
    const dietaryPreferences = {
      hasAllergies: dietaryPrefs?.has_allergies || false,
      allergies: dietaryPrefs?.allergies || [],
      dietaryRestrictions: dietaryPrefs?.dietary_restrictions || [],
      trainingTime: dietaryPrefs?.training_time || null
    }

    // Calcular distribuição de macros
    const macroTargets = calculateMacroDistribution(dailyCalories, goal);

    // Filtrar alimentos baseado nas restrições salvas
    let availableFoods = [...selectedFoods];
    if (dietaryPreferences.hasAllergies && dietaryPreferences.allergies.length > 0) {
      availableFoods = availableFoods.filter(food => 
        !dietaryPreferences.allergies.some(allergy => 
          food.name.toLowerCase().includes(allergy.toLowerCase())
        )
      );
    }

    // Filtrar alimentos baseado nas restrições dietéticas
    if (dietaryPreferences.dietaryRestrictions.length > 0) {
      availableFoods = availableFoods.filter(food => {
        const restrictions = dietaryPreferences.dietaryRestrictions;
        if (restrictions.includes('vegetarian')) {
          return !food.food_category?.includes('meat');
        }
        if (restrictions.includes('vegan')) {
          return !food.food_category?.some(cat => 
            ['meat', 'dairy', 'eggs'].includes(cat)
          );
        }
        return true;
      });
    }

    // Função para gerar uma refeição
    function generateMeal(foods, targetCalories, maxFoods = 3) {
      let meal = {
        foods: [],
        calories: 0,
        macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 },
        description: ''
      };
    
      let attempts = 0;
      const maxAttempts = 100;
    
      while (meal.calories < targetCalories && attempts < maxAttempts) {
        attempts++;
        const food = foods[Math.floor(Math.random() * foods.length)];
    
        if (!food) continue;
    
        const portion = Math.min(100, (targetCalories - meal.calories) / (food.calories / 100));
        if (portion <= 0) continue;
    
        const foodCalories = (food.calories / 100) * portion;
    
        if (meal.calories + foodCalories <= targetCalories && meal.foods.length < maxFoods) {
          meal.calories += foodCalories;
          meal.macros.protein += (food.protein / 100) * portion;
          meal.macros.carbs += (food.carbs / 100) * portion;
          meal.macros.fats += (food.fats / 100) * portion;
          meal.macros.fiber += (food.fiber / 100) * portion;
    
          meal.foods.push({
            name: food.name,
            portion: Math.round(portion),
            unit: food.portionUnit || 'g',
            details: `${Math.round(foodCalories)} kcal`
          });
        }
      }
    
      meal.description = `Refeição com ${meal.foods.map(f => f.name).join(', ')}.`;
      return meal;
    }

    // Função para calcular a distribuição de macros
    function calculateMacroDistribution(dailyCalories, goal) {
      let proteinPercentage, carbPercentage, fatPercentage;
    
      switch (goal) {
        case 'lose_weight':
          proteinPercentage = 0.35;
          carbPercentage = 0.35;
          fatPercentage = 0.30;
          break;
        case 'gain_weight':
          proteinPercentage = 0.30;
          carbPercentage = 0.40;
          fatPercentage = 0.30;
          break;
        default:
          proteinPercentage = 0.30;
          carbPercentage = 0.40;
          fatPercentage = 0.30;
      }
    
      return {
        protein: dailyCalories * proteinPercentage / 4,
        carbs: dailyCalories * carbPercentage / 4,
        fats: dailyCalories * fatPercentage / 9
      };
    }

    // Função para calcular a nutrição total de um plano diário
    function calculateTotalNutrition(dailyPlan) {
      let totalCalories = 0;
      let totalMacros = { protein: 0, carbs: 0, fats: 0, fiber: 0 };
    
      for (const meal in dailyPlan) {
        if (dailyPlan.hasOwnProperty(meal)) {
          const currentMeal = dailyPlan[meal];
          totalCalories += currentMeal.calories;
          totalMacros.protein += currentMeal.macros.protein;
          totalMacros.carbs += currentMeal.macros.carbs;
          totalMacros.fats += currentMeal.macros.fats;
          totalMacros.fiber += currentMeal.macros.fiber;
        }
      }
    
      return {
        calories: totalCalories,
        macros: totalMacros
      };
    }

    // Função para gerar recomendações personalizadas
    function generateRecommendations(userData, dietaryPreferences) {
      let recommendations = {
        hydration: 'Mantenha-se hidratado bebendo água regularmente.',
        sleep: 'Tente dormir de 7 a 8 horas por noite.',
        exercise: 'Faça exercícios regularmente para melhorar sua saúde geral.',
        additional: []
      };
    
      if (dietaryPreferences.hasAllergies) {
        recommendations.additional.push(`Evite alimentos que contenham ${dietaryPreferences.allergies.join(', ')}.`);
      }
    
      if (userData.goal === 'lose_weight') {
        recommendations.additional.push('Consuma alimentos ricos em fibras para aumentar a saciedade.');
      } else if (userData.goal === 'gain_weight') {
        recommendations.additional.push('Aumente a ingestão de proteínas para ajudar na construção muscular.');
      }
    
      return recommendations;
    }

    const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const MEAL_DISTRIBUTION = {
      breakfast: 0.25,
      morningSnack: 0.15,
      lunch: 0.30,
      afternoonSnack: 0.15,
      dinner: 0.15
    };

    // Gerar plano semanal considerando horário de treino
    const weeklyPlan = {};
    const trainingTime = dietaryPreferences.trainingTime;
    
    for (const day of WEEKDAYS) {
      let dayPlan;
      if (trainingTime) {
        const trainingHour = new Date(`2000-01-01T${trainingTime}`).getHours();
        
        // Ajustar distribuição das refeições com base no horário de treino
        const adjustedDistribution = getAdjustedMealDistribution(trainingHour);
        
        dayPlan = {
          breakfast: generateMeal(availableFoods, adjustedDistribution.breakfast * dailyCalories, 1),
          morningSnack: generateMeal(availableFoods, adjustedDistribution.morningSnack * dailyCalories, 3),
          lunch: generateMeal(availableFoods, adjustedDistribution.lunch * dailyCalories, 2),
          afternoonSnack: generateMeal(availableFoods, adjustedDistribution.afternoonSnack * dailyCalories, 3),
          dinner: generateMeal(availableFoods, adjustedDistribution.dinner * dailyCalories, 2)
        };
      } else {
        dayPlan = {
          breakfast: generateMeal(availableFoods, MEAL_DISTRIBUTION.breakfast * dailyCalories, 1),
          morningSnack: generateMeal(availableFoods, MEAL_DISTRIBUTION.morningSnack * dailyCalories, 3),
          lunch: generateMeal(availableFoods, MEAL_DISTRIBUTION.lunch * dailyCalories, 2),
          afternoonSnack: generateMeal(availableFoods, MEAL_DISTRIBUTION.afternoonSnack * dailyCalories, 3),
          dinner: generateMeal(availableFoods, MEAL_DISTRIBUTION.dinner * dailyCalories, 2)
        };
      }

      weeklyPlan[day] = dayPlan;
    }

    // Gerar recomendações personalizadas baseadas nas preferências salvas
    const recommendations = generateRecommendations(userData, dietaryPreferences);

    // Calcular nutrição total
    const totalNutrition = calculateTotalNutrition(weeklyPlan.Segunda);

    const mealPlan = {
      weeklyPlan,
      totalNutrition,
      recommendations,
      dietaryPreferences // Incluir preferências usadas na resposta
    };

    // Analisar o plano gerado
    const { data: analysis, error: analysisError } = await supabase.functions.invoke(
      'analyze-meal-plan',
      {
        body: {
          mealPlan,
          userData,
          dietaryPreferences
        }
      }
    );

    if (analysisError) {
      throw new Error('Erro na análise do plano: ' + analysisError.message);
    }

    if (!analysis.isApproved) {
      // Tentar gerar novo plano com ajustes baseados na análise
      console.log('Plano não aprovado. Motivo:', analysis.analysis);
      
      // Recursivamente gerar novo plano (com limite de tentativas)
      const maxAttempts = 3;
      let attempts = 1;
      
      while (!analysis.isApproved && attempts < maxAttempts) {
        attempts++;
        return await generateMealPlan(req); // Recursão para tentar novamente
      }
      
      if (!analysis.isApproved) {
        throw new Error('Não foi possível gerar um plano adequado após várias tentativas');
      }
    }

    // Incluir a análise no plano final
    mealPlan.recommendations.aiAnalysis = analysis.analysis;

    return new Response(
      JSON.stringify(mealPlan),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function getAdjustedMealDistribution(trainingHour: number) {
  // Ajusta a distribuição das refeições com base no horário de treino
  if (trainingHour < 10) { // Treino pela manhã
    return {
      breakfast: 0.20,    // Café da manhã mais leve antes do treino
      morningSnack: 0.25, // Refeição pós-treino mais substancial
      lunch: 0.30,
      afternoonSnack: 0.10,
      dinner: 0.15
    };
  } else if (trainingHour < 16) { // Treino à tarde
    return {
      breakfast: 0.25,
      morningSnack: 0.15,
      lunch: 0.25,        // Almoço mais leve
      afternoonSnack: 0.20, // Lanche pré/pós treino mais substancial
      dinner: 0.15
    };
  } else { // Treino à noite
    return {
      breakfast: 0.25,
      morningSnack: 0.15,
      lunch: 0.30,
      afternoonSnack: 0.15,
      dinner: 0.15        // Jantar mais leve devido ao treino
    };
  }
}
