
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      userData,
      selectedFoods,
      dietaryPreferences
    } = await req.json();

    // Validate input data
    if (!userData || !selectedFoods || !dietaryPreferences) {
      throw new Error('Missing required input data');
    }

    console.log('Input data:', { userData, selectedFoods, dietaryPreferences });

    // Check if DeepSeek API key is configured
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DeepSeek API key is not configured');
    }

    // Prepare system message with nutritionist expertise
    const systemMessage = `You are an expert nutritionist specialized in personalized meal planning. Create a meal plan based on the following criteria:
    - User's data: ${JSON.stringify(userData)}
    - Selected foods: ${JSON.stringify(selectedFoods)}
    - Dietary preferences: ${JSON.stringify(dietaryPreferences)}
    
    Follow these rules:
    1. Only use foods from the selected foods list
    2. Distribute meals according to daily caloric needs
    3. Balance macronutrients based on the user's goal
    4. Consider dietary restrictions and allergies
    5. Format the response as JSON with the following structure:
    {
      "dailyPlan": {
        "breakfast": { "foods": [], "calories": 0, "macros": {} },
        "morningSnack": { "foods": [], "calories": 0, "macros": {} },
        "lunch": { "foods": [], "calories": 0, "macros": {} },
        "afternoonSnack": { "foods": [], "calories": 0, "macros": {} },
        "dinner": { "foods": [], "calories": 0, "macros": {} }
      },
      "totalNutrition": {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fats": 0
      },
      "recommendations": {
        "preworkout": "",
        "postworkout": "",
        "general": ""
      }
    }`;

    console.log('Making request to DeepSeek');

    // Make request to DeepSeek
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: 'Generate a personalized meal plan based on the provided data.' }
        ],
        temperature: 0.7,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('DeepSeek API error:', errorText);
      throw new Error(`DeepSeek API error: ${errorText}`);
    }

    const aiData = await deepseekResponse.json();
    console.log('DeepSeek response:', aiData);

    if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
      throw new Error('Invalid response format from DeepSeek');
    }

    const mealPlan = JSON.parse(aiData.choices[0].message.content);

    // Validate meal plan structure
    if (!mealPlan.dailyPlan || !mealPlan.totalNutrition || !mealPlan.recommendations) {
      throw new Error('Invalid meal plan structure generated');
    }

    // Save meal plan to database
    const { error: saveError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userData.userId,
        daily_calories: mealPlan.totalNutrition.calories,
        protein_target: mealPlan.totalNutrition.protein,
        carbs_target: mealPlan.totalNutrition.carbs,
        fats_target: mealPlan.totalNutrition.fats,
        meal_recommendations: mealPlan
      });

    if (saveError) {
      console.error('Database save error:', saveError);
      throw saveError;
    }

    return new Response(
      JSON.stringify(mealPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-meal-plan function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
