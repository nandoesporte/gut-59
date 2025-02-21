
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { analyzeMealPlan } from './meal-analyzer.ts';
import { optimizeMeal } from './meal-optimizer.ts';
import { generateRecommendations } from './recommendations.ts';
import { calculateDailyMacros } from './calculators.ts';
import { validatePlanData } from './validator.ts';

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
    const mealPlans = [];

    // Gerar 3 planos diferentes
    for (let i = 0; i < 3; i++) {
      console.log(`Gerando plano ${i + 1}...`);
      
      const dailyCalories = userData.dailyCalories;
      const { protein, carbs, fats } = calculateDailyMacros(dailyCalories, userData.goal);

      const dailyPlan = await optimizeMeal({
        selectedFoods,
        dailyCalories,
        targetMacros: { protein, carbs, fats },
        preferences: dietaryPreferences,
        trainingTime: dietaryPreferences.trainingTime,
        variation: i // Passando o índice para gerar variações diferentes
      });

      const mealPlanAnalysis = analyzeMealPlan(dailyPlan);
      const recommendations = generateRecommendations({
        mealPlan: dailyPlan,
        userGoal: userData.goal,
        trainingTime: dietaryPreferences.trainingTime,
        analysis: mealPlanAnalysis
      });

      const totalNutrition = {
        calories: Object.values(dailyPlan).reduce((total, meal) => total + (meal?.calories || 0), 0),
        protein: Object.values(dailyPlan).reduce((total, meal) => total + (meal?.macros.protein || 0), 0),
        carbs: Object.values(dailyPlan).reduce((total, meal) => total + (meal?.macros.carbs || 0), 0),
        fats: Object.values(dailyPlan).reduce((total, meal) => total + (meal?.macros.fats || 0), 0),
        fiber: Object.values(dailyPlan).reduce((total, meal) => total + (meal?.macros.fiber || 0), 0)
      };

      const planData = {
        dailyPlan,
        totalNutrition,
        recommendations
      };

      // Validar o plano gerado
      const validationError = validatePlanData(planData);
      if (validationError) {
        throw new Error(`Erro na validação do plano ${i + 1}: ${validationError}`);
      }

      console.log(`Plano ${i + 1} gerado com sucesso`);

      // Salvar o plano no banco de dados
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.userId,
          plan_data: planData,
          calories: dailyCalories,
          dietary_preferences: dietaryPreferences,
          active: false, // Começa como inativo até o usuário selecionar
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao salvar plano ${i + 1}: ${error.message}`);
      }

      mealPlans.push(data);
    }

    console.log('Todos os planos gerados com sucesso');

    return new Response(JSON.stringify(mealPlans), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao gerar planos:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno ao gerar planos alimentares' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
