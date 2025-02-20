
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    console.log('Received request data:', { userData, selectedFoods, dietaryPreferences });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's health condition
    const { data: nutritionPrefs, error: prefsError } = await supabase
      .from('nutrition_preferences')
      .select('health_condition')
      .eq('user_id', userData.userId)
      .maybeSingle();

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
    - Allergies: ${dietaryPreferences.allergies?.join(', ') || 'None'}
    - Dietary Restrictions: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'None'}
    - Training Time: ${dietaryPreferences.trainingTime || 'Not specified'}`;

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
        "breakfast": { "foods": [], "calories": 0, "macros": { "protein": 0, "carbs": 0, "fats": 0, "fiber": 0 } },
        "morningSnack": { "foods": [], "calories": 0, "macros": { "protein": 0, "carbs": 0, "fats": 0, "fiber": 0 } },
        "lunch": { "foods": [], "calories": 0, "macros": { "protein": 0, "carbs": 0, "fats": 0, "fiber": 0 } },
        "afternoonSnack": { "foods": [], "calories": 0, "macros": { "protein": 0, "carbs": 0, "fats": 0, "fiber": 0 } },
        "dinner": { "foods": [], "calories": 0, "macros": { "protein": 0, "carbs": 0, "fats": 0, "fiber": 0 } }
      },
      "totalNutrition": {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fats": 0,
        "fiber": 0
      },
      "recommendations": {
        "general": "",
        "preworkout": "",
        "postworkout": "",
        "timing": []
      }
    }`;

    // Call OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('Calling OpenAI API...');
    
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
    console.log('OpenAI API Response:', aiResponse);
    
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

      mealPlan.recommendations.timing.push(
        `Consuma sua refeição pré-treino 2-3 horas antes do treino (${hour - 2}:00)`,
        `Faça sua refeição pós-treino em até 1 hora após o treino (${hour + 1}:00)`
      );
    }

    console.log('Generated meal plan:', mealPlan);

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-meal-plan:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
