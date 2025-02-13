
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    let requestData;
    try {
      requestData = await req.json();
      console.log('Received request data:', requestData);
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          details: parseError.message
        }), 
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const { userData, selectedFoods, dietaryPreferences } = requestData;

    // Validate required fields
    if (!userData || !selectedFoods || !dietaryPreferences) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'userData, selectedFoods, and dietaryPreferences are required'
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get selected foods details from database
    const { data: foodsData, error: foodsError } = await supabase
      .from('protocol_foods')
      .select('*')
      .in('id', selectedFoods);

    if (foodsError) {
      console.error('Error fetching foods:', foodsError);
      return new Response(
        JSON.stringify({
          error: 'Database error',
          details: foodsError.message
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    if (!foodsData || foodsData.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No foods found',
          details: 'No foods found for the selected IDs'
        }),
        { 
          status: 404,
          headers: corsHeaders
        }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          details: 'OpenAI API key is not configured'
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    const systemMessage = `You are a professional nutritionist AI that creates structured meal plans. 
Your task is to create a meal plan using ONLY the foods from the provided list, following the user's preferences and restrictions.

CRITICAL: You must respond ONLY with a valid JSON object. Do not include any additional text, explanations, or formatting.

Required JSON structure:
{
  "dailyPlan": {
    "breakfast": {
      "foods": [],
      "calories": 0,
      "macros": {
        "protein": 0,
        "carbs": 0,
        "fats": 0
      }
    },
    "morningSnack": {
      "foods": [],
      "calories": 0,
      "macros": {
        "protein": 0,
        "carbs": 0,
        "fats": 0
      }
    },
    "lunch": {
      "foods": [],
      "calories": 0,
      "macros": {
        "protein": 0,
        "carbs": 0,
        "fats": 0
      }
    },
    "afternoonSnack": {
      "foods": [],
      "calories": 0,
      "macros": {
        "protein": 0,
        "carbs": 0,
        "fats": 0
      }
    },
    "dinner": {
      "foods": [],
      "calories": 0,
      "macros": {
        "protein": 0,
        "carbs": 0,
        "fats": 0
      }
    }
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
}

Available Foods:
${JSON.stringify(foodsData)}

User Data:
Weight: ${userData.weight}kg
Height: ${userData.height}cm
Age: ${userData.age}
Gender: ${userData.gender}
Activity Level: ${userData.activityLevel}
Goal: ${userData.goal}
Daily Calorie Target: ${userData.dailyCalories}

Dietary Preferences:
${JSON.stringify(dietaryPreferences)}

Rules:
1. ONLY use foods from the provided list
2. Distribute meals to meet the daily calorie target
3. Balance macronutrients based on the user's goal
4. Respect dietary restrictions and allergies
5. ONLY return a valid JSON object, no additional text
6. Each meal's foods array should contain complete food objects from the available foods list`;

    console.log('Making request to OpenAI');

    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemMessage },
            { 
              role: 'user', 
              content: 'Create a meal plan following the exact JSON structure provided. Return ONLY the JSON object.' 
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      const aiData = await openAIResponse.json();
      console.log('OpenAI raw response:', aiData);

      if (!aiData.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI');
      }

      const content = aiData.choices[0].message.content.trim();
      console.log('OpenAI content:', content);

      let mealPlan;
      try {
        mealPlan = JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.error('Raw content:', content);
        throw new Error('Failed to parse meal plan JSON');
      }

      // Validate meal plan structure
      if (!mealPlan.dailyPlan || !mealPlan.totalNutrition || !mealPlan.recommendations) {
        throw new Error('Invalid meal plan structure');
      }

      // Save to database
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
        console.error('Error saving to database:', saveError);
        throw saveError;
      }

      return new Response(
        JSON.stringify(mealPlan),
        { headers: corsHeaders }
      );

    } catch (openAIError) {
      console.error('OpenAI or parsing error:', openAIError);
      return new Response(
        JSON.stringify({
          error: 'AI Processing Error',
          details: openAIError.message
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

  } catch (error) {
    console.error('General error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error.message
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
