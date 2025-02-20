
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserData {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  userId: string;
  dailyCalories: number;
}

interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's health condition
    const { data: nutritionPrefs, error: prefsError } = await supabase
      .from('nutrition_preferences')
      .select('health_condition')
      .eq('user_id', userData.userId)
      .single();

    if (prefsError) {
      console.error('Error fetching nutrition preferences:', prefsError);
      throw prefsError;
    }

    // Prepare system prompt
    const systemPrompt = `You are a professional nutritionist AI that creates personalized meal plans. 
    Consider the following parameters:
    - Goal: ${userData.goal}
    - Health Condition: ${nutritionPrefs?.health_condition || 'None'}
    - Daily Caloric Need: ${userData.dailyCalories} calories
    - Activity Level: ${userData.activityLevel}
    - Allergies: ${dietaryPreferences.allergies.join(', ') || 'None'}
    - Dietary Restrictions: ${dietaryPreferences.dietaryRestrictions.join(', ') || 'None'}
    - Training Time: ${dietaryPreferences.trainingTime || 'Not specified'}

    Create a meal plan that:
    1. Distributes calories across 5 meals
    2. Maintains proper macro distribution
    3. Considers timing for pre/post workout nutrition
    4. Avoids any allergens
    5. Respects dietary restrictions
    6. Uses only the provided food list
    7. Provides specific portions in grams
    8. Includes nutritional recommendations`;

    // Prepare foods data for the prompt
    const foodsData = selectedFoods.map(food => ({
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      portion: food.portion_size,
      unit: food.portion_unit
    }));

    const userPrompt = `Generate a detailed meal plan using only these foods: ${JSON.stringify(foodsData)}
    Format the response as a JSON object with the following structure:
    {
      "dailyPlan": {
        "breakfast": { "foods": [], "calories": 0, "macros": {} },
        "morningSnack": { "foods": [], "calories": 0, "macros": {} },
        "lunch": { "foods": [], "calories": 0, "macros": {} },
        "afternoonSnack": { "foods": [], "calories": 0, "macros": {} },
        "dinner": { "foods": [], "calories": 0, "macros": {} }
      },
      "totalNutrition": { "calories": 0, "protein": 0, "carbs": 0, "fats": 0 },
      "recommendations": {
        "general": "",
        "preworkout": "",
        "postworkout": "",
        "timing": []
      }
    }`;

    // Call OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const aiResponse = await response.json();
    
    if (!aiResponse.choices || !aiResponse.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }

    let mealPlan;
    try {
      mealPlan = JSON.parse(aiResponse.choices[0].message.content);
    } catch (e) {
      console.error('Error parsing AI response:', e);
      throw new Error('Failed to parse meal plan data');
    }

    // Validate caloric distribution
    const totalCalories = Object.values(mealPlan.dailyPlan).reduce(
      (sum: number, meal: any) => sum + meal.calories,
      0
    );

    if (Math.abs(totalCalories - userData.dailyCalories) > 200) {
      console.warn('Caloric mismatch detected, adjusting portions...');
      // Adjust portions to match target calories
      const adjustmentFactor = userData.dailyCalories / totalCalories;
      Object.values(mealPlan.dailyPlan).forEach((meal: any) => {
        meal.calories = Math.round(meal.calories * adjustmentFactor);
        meal.foods.forEach((food: any) => {
          food.portion = Math.round(food.portion * adjustmentFactor);
        });
      });
    }

    // Add any health-specific recommendations
    if (nutritionPrefs?.health_condition) {
      const healthCondition = nutritionPrefs.health_condition;
      mealPlan.recommendations.healthCondition = healthCondition;
      
      // Add specific recommendations based on health condition
      if (healthCondition === 'diabetes') {
        mealPlan.recommendations.timing.push(
          "Mantenha intervalos regulares entre as refeições para controle glicêmico",
          "Priorize alimentos com baixo índice glicêmico",
          "Monitore sua glicemia antes e após as refeições"
        );
      } else if (healthCondition === 'hipertensao') {
        mealPlan.recommendations.timing.push(
          "Limite o consumo de sódio a 2000mg por dia",
          "Priorize alimentos ricos em potássio",
          "Mantenha uma boa hidratação"
        );
      }
    }

    // Add workout timing recommendations if training time is specified
    if (dietaryPreferences.trainingTime) {
      const trainingTime = new Date(`1970-01-01T${dietaryPreferences.trainingTime}`);
      const hour = trainingTime.getHours();

      // Add pre and post workout meal timing recommendations
      mealPlan.recommendations.timing.push(
        `Consuma sua refeição pré-treino 2-3 horas antes do treino (${hour - 2}:00)`,
        `Faça sua refeição pós-treino em até 1 hora após o treino (${hour + 1}:00)`
      );
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
