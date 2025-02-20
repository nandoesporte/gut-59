
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateMealPlan, standardizeUnits } from "./validator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    
    console.log('Starting meal plan generation...');
    console.log('User data:', JSON.stringify(userData));
    console.log('Selected foods:', JSON.stringify(selectedFoods));

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a nutrition expert. Create a daily meal plan in Portuguese using ONLY the provided foods.
    Include breakfast, morning snack, lunch, afternoon snack, and dinner.
    For each meal, specify portions in grams or units, and calculate calories and macros.
    Return a JSON object with this exact structure:
    {
      "dailyPlan": {
        "breakfast": {
          "description": "string",
          "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        },
        // Same structure for morningSnack, lunch, afternoonSnack, dinner
      },
      "totalNutrition": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fats": number,
        "fiber": number
      },
      "recommendations": {
        "general": "string",
        "preworkout": "string",
        "postworkout": "string",
        "timing": ["string"]
      }
    }`;

    const userPrompt = `Create a meal plan with:
    Target Calories: ${userData.dailyCalories}kcal
    Profile: ${userData.age} years, ${userData.gender}, ${userData.weight}kg
    Goal: ${userData.goal}
    Available Foods: ${selectedFoods.map(f => `${f.name} (${f.calories}kcal/100g, P:${f.protein}g, C:${f.carbs}g, F:${f.fats}g)`).join(', ')}
    Dietary Restrictions: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'None'}
    Allergies: ${dietaryPreferences.allergies?.join(', ') || 'None'}
    Training Time: ${dietaryPreferences.trainingTime || 'Not specified'}`;

    console.log('Sending request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Error:', errorText);
      throw new Error('Failed to generate meal plan');
    }

    const data = await response.json();
    console.log('Received response from OpenAI');

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response:', data);
      throw new Error('Invalid model response');
    }

    try {
      const content = data.choices[0].message.content;
      console.log('Parsing response:', content);
      const mealPlan = JSON.parse(content);
      console.log('Parsed meal plan:', JSON.stringify(mealPlan));

      // Ensure the meal plan has the required structure
      if (!mealPlan.dailyPlan || !mealPlan.totalNutrition || !mealPlan.recommendations) {
        throw new Error('Invalid meal plan structure');
      }

      // Return the meal plan with 200 status
      return new Response(
        JSON.stringify(mealPlan),
        { 
          status: 200, 
          headers: corsHeaders 
        }
      );

    } catch (error) {
      console.error('Error processing meal plan:', error);
      throw new Error(`Failed to process meal plan: ${error.message}`);
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }), 
      { 
        status: 200, // Keep 200 for Supabase edge functions
        headers: corsHeaders 
      }
    );
  }
});
