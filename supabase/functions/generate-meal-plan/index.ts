
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();

    // Validação inicial dos dados recebidos
    if (!userData || !selectedFoods || !dietaryPreferences) {
      console.error('Dados inválidos recebidos:', { userData, selectedFoods, dietaryPreferences });
      return new Response(
        JSON.stringify({ error: 'Dados inválidos ou incompletos' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const mealPlans = [];

    // Gerar 3 planos diferentes
    for (let i = 0; i < 3; i++) {
      console.log(`Gerando plano ${i + 1}...`);
      
      const dailyCalories = userData.dailyCalories;
      const { protein, carbs, fats } = calculateDailyMacros(dailyCalories, userData.goal);

      try {
        const dailyPlan = await optimizeMeal({
          selectedFoods,
          dailyCalories,
          targetMacros: { protein, carbs, fats },
          preferences: dietaryPreferences,
          trainingTime: dietaryPreferences.trainingTime,
          variation: i
        });

        const mealPlanAnalysis = analyzeMealPlan(dailyPlan);
        const recommendations = generateRecommendations({
          mealPlan: { dailyPlan, totalNutrition: { calories: 0, protein: 0, carbs: 0, fats: 0 }, recommendations: [] },
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
          console.error(`Erro na validação do plano ${i + 1}:`, validationError);
          continue;
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
            active: false
          })
          .select()
          .single();

        if (error) {
          console.error(`Erro ao salvar plano ${i + 1}:`, error);
          continue;
        }

        mealPlans.push(data);

      } catch (planError) {
        console.error(`Erro ao gerar plano ${i + 1}:`, planError);
        continue;
      }
    }

    if (mealPlans.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível gerar nenhum plano alimentar válido' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`${mealPlans.length} planos gerados com sucesso`);

    return new Response(
      JSON.stringify(mealPlans),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro ao gerar planos:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno ao gerar planos alimentares',
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
