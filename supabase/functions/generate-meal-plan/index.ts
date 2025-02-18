
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    
    console.log('Received request:', { userData, selectedFoods, dietaryPreferences });

    // Fetch foods data
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: foodsData, error: foodsError } = await supabase
      .from('protocol_foods')
      .select('*')
      .in('id', selectedFoods);

    if (foodsError) {
      console.error('Error fetching foods:', foodsError);
      throw new Error('Failed to fetch foods data');
    }

    if (!foodsData || foodsData.length === 0) {
      throw new Error('No foods found');
    }

    console.log('Foods data:', foodsData);

    // Calculate adjusted calories based on goal
    let adjustedCalories = userData.dailyCalories;
    if (userData.goal === 'lose') {
      adjustedCalories = Math.round(userData.dailyCalories * 0.8);
    } else if (userData.goal === 'gain') {
      adjustedCalories = Math.round(userData.dailyCalories * 1.2);
    }

    // Calculate macro distribution
    const macroNeeds = {
      protein: Math.round(userData.weight * (userData.goal === 'gain' ? 2.2 : 2)),
      carbs: Math.round((adjustedCalories * 0.45) / 4),
      fats: Math.round((adjustedCalories * 0.25) / 9)
    };

    // Distribute calories across meals
    const mealDistribution = {
      breakfast: 0.3,
      morningSnack: 0.15,
      lunch: 0.25,
      afternoonSnack: 0.15,
      dinner: 0.15
    };

    // Helper function to distribute foods into meals
    const distributeFoodsIntoMeals = (foods: any[], totalCalories: number) => {
      const meals = {
        breakfast: { foods: [], calories: Math.round(totalCalories * mealDistribution.breakfast), macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 } },
        morningSnack: { foods: [], calories: Math.round(totalCalories * mealDistribution.morningSnack), macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 } },
        lunch: { foods: [], calories: Math.round(totalCalories * mealDistribution.lunch), macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 } },
        afternoonSnack: { foods: [], calories: Math.round(totalCalories * mealDistribution.afternoonSnack), macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 } },
        dinner: { foods: [], calories: Math.round(totalCalories * mealDistribution.dinner), macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 } }
      };

      // Distribute foods across meals
      foods.forEach(food => {
        const mealTypes = food.meal_type || ['any'];
        let assigned = false;

        if (mealTypes.includes('breakfast') && meals.breakfast.calories > 0) {
          meals.breakfast.foods.push(food);
          meals.breakfast.macros.protein += food.protein || 0;
          meals.breakfast.macros.carbs += food.carbs || 0;
          meals.breakfast.macros.fats += food.fats || 0;
          meals.breakfast.macros.fiber += food.fiber || 0;
          assigned = true;
        } else if (mealTypes.includes('lunch') && meals.lunch.calories > 0) {
          meals.lunch.foods.push(food);
          meals.lunch.macros.protein += food.protein || 0;
          meals.lunch.macros.carbs += food.carbs || 0;
          meals.lunch.macros.fats += food.fats || 0;
          meals.lunch.macros.fiber += food.fiber || 0;
          assigned = true;
        } else if (mealTypes.includes('snack') && meals.morningSnack.calories > 0) {
          meals.morningSnack.foods.push(food);
          meals.morningSnack.macros.protein += food.protein || 0;
          meals.morningSnack.macros.carbs += food.carbs || 0;
          meals.morningSnack.macros.fats += food.fats || 0;
          meals.morningSnack.macros.fiber += food.fiber || 0;
          assigned = true;
        }

        if (!assigned) {
          // Distribute remaining foods based on calories
          if (meals.breakfast.foods.length < 3) {
            meals.breakfast.foods.push(food);
            meals.breakfast.macros.protein += food.protein || 0;
            meals.breakfast.macros.carbs += food.carbs || 0;
            meals.breakfast.macros.fats += food.fats || 0;
            meals.breakfast.macros.fiber += food.fiber || 0;
          } else if (meals.lunch.foods.length < 4) {
            meals.lunch.foods.push(food);
            meals.lunch.macros.protein += food.protein || 0;
            meals.lunch.macros.carbs += food.carbs || 0;
            meals.lunch.macros.fats += food.fats || 0;
            meals.lunch.macros.fiber += food.fiber || 0;
          } else if (meals.dinner.foods.length < 3) {
            meals.dinner.foods.push(food);
            meals.dinner.macros.protein += food.protein || 0;
            meals.dinner.macros.carbs += food.carbs || 0;
            meals.dinner.macros.fats += food.fats || 0;
            meals.dinner.macros.fiber += food.fiber || 0;
          }
        }
      });

      return meals;
    };

    const dailyPlan = distributeFoodsIntoMeals(foodsData, adjustedCalories);

    // Generate recommendations
    const recommendations = {
      general: "",
      preworkout: "",
      postworkout: "",
      timing: [] as string[],
    };

    // Adiciona recomendação específica para níveis baixos de atividade física
    if (userData.activityLevel === 'sedentary' || userData.activityLevel === 'lightlyActive') {
      recommendations.general = 
        "IMPORTANTE: Seu nível atual de atividade física está baixo. Recomendamos fortemente que você: \n" +
        "1. Inicie uma rotina regular de exercícios físicos\n" +
        "2. Comece com atividades leves como caminhada\n" +
        "3. Busque orientação profissional para iniciar atividades físicas\n" +
        "4. Atualize seu plano alimentar após estabelecer uma rotina de exercícios\n\n";
    }

    // Adiciona recomendações baseadas no objetivo
    switch (userData.goal) {
      case 'lose':
        recommendations.general += 
          "Mantenha um déficit calórico controlado e foque em alimentos ricos em proteína para preservar a massa magra. " +
          "Distribua as refeições ao longo do dia para controlar a fome.";
        recommendations.timing.push(
          "Faça refeições a cada 3-4 horas para manter o metabolismo ativo",
          "Evite refeições pesadas próximo ao horário de dormir"
        );
        break;
      case 'gain':
        recommendations.general += 
          "Mantenha um superávit calórico controlado com foco em proteínas de alta qualidade. " +
          "Priorize refeições mais calóricas após o treino.";
        recommendations.timing.push(
          "Aumente gradualmente o tamanho das porções",
          "Consuma proteína em todas as refeições principais"
        );
        break;
      default:
        recommendations.general += 
          "Mantenha uma alimentação equilibrada com foco em alimentos nutritivos. " +
          "Distribua bem os macronutrientes ao longo do dia.";
        recommendations.timing.push(
          "Mantenha horários regulares para as refeições",
          "Equilibre proteínas, carboidratos e gorduras boas"
        );
    }

    // Recomendações específicas para treino
    if (dietaryPreferences.trainingTime) {
      const trainHour = parseInt(dietaryPreferences.trainingTime.split(':')[0]);
      
      if (userData.goal === 'lose') {
        recommendations.preworkout = 
          "Consuma uma refeição leve com carboidratos complexos 1-2 horas antes do treino.";
        recommendations.postworkout = 
          "Priorize proteínas magras e carboidratos moderados após o treino.";
      } else if (userData.goal === 'gain') {
        recommendations.preworkout = 
          "Faça uma refeição rica em carboidratos e proteínas 1-2 horas antes do treino.";
        recommendations.postworkout = 
          "Consuma proteínas de rápida absorção e carboidratos logo após o treino.";
      } else {
        recommendations.preworkout = 
          "Consuma carboidratos de fácil digestão 30-60 minutos antes do treino.";
        recommendations.postworkout = 
          "Equilibre proteínas e carboidratos após o treino para recuperação.";
      }

      recommendations.timing.push(
        `Faça sua refeição pré-treino cerca de 1-2 horas antes do exercício (${trainHour-2}:00)`,
        `Consuma sua refeição pós-treino em até 30 minutos após o término do exercício (${trainHour+1}:00)`
      );
    }

    const response = {
      dailyPlan,
      totalNutrition: {
        calories: adjustedCalories,
        ...macroNeeds,
      },
      recommendations,
    };

    console.log('Generated meal plan:', response);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
