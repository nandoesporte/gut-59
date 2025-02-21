
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    console.log('Input data:', {
      userData,
      selectedFoodsCount: selectedFoods?.length,
      dietaryPreferences
    });

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    const systemPrompt = `You are a nutrition expert. Create a weekly meal plan in Portuguese using ONLY the provided foods.
    Return a JSON object with this exact structure for each day:

    {
      "monday": {
        "dailyPlan": {
          "breakfast": {
            "foods": [
              {
                "name": "string",
                "portion": number,
                "unit": "string",
                "details": "string"
              }
            ],
            "calories": number
          },
          "morningSnack": { /* same as breakfast */ },
          "lunch": { /* same as breakfast */ },
          "afternoonSnack": { /* same as breakfast */ },
          "dinner": { /* same as breakfast */ }
        },
        "totalNutrition": {
          "calories": number
        }
      },
      /* same structure for tuesday through sunday */,
      "recommendations": {
        "general": "string",
        "preworkout": "string",
        "postworkout": "string"
      }
    }`;

    const userPrompt = `Create a weekly meal plan with:
    Target Daily Calories: ${userData.dailyCalories}kcal
    Profile: ${userData.age} years, ${userData.gender}, ${userData.weight}kg
    Goal: ${userData.goal}
    Available Foods: ${selectedFoods.map(f => `${f.name} (${f.calories}kcal/100g)`).join(', ')}
    Dietary Restrictions: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'None'}
    Allergies: ${dietaryPreferences.allergies?.join(', ') || 'None'}
    Training Time: ${dietaryPreferences.trainingTime || 'Not specified'}

    Requirements:
    1. Use ONLY the provided foods
    2. Keep daily calories close to the target
    3. Create varied meals across the week
    4. Include ALL required fields in the JSON structure
    5. All numeric values must be numbers (not strings)
    6. Return ONLY the JSON object, no additional text`;

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI Error:', await response.text());
      return new Response(
        JSON.stringify({ error: 'Failed to generate meal plan' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid model response' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    try {
      const content = data.choices[0].message.content.trim();
      console.log('Parsing response...');
      
      const weeklyPlan = JSON.parse(content);
      console.log('Successfully parsed JSON');

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const meals = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'];

      // Validate the structure
      for (const day of days) {
        if (!weeklyPlan[day]) {
          throw new Error(`Missing day: ${day}`);
        }

        const dayPlan = weeklyPlan[day];
        if (!dayPlan.dailyPlan) {
          throw new Error(`Missing dailyPlan for ${day}`);
        }

        for (const meal of meals) {
          const mealPlan = dayPlan.dailyPlan[meal];
          if (!mealPlan) {
            throw new Error(`Missing ${meal} for ${day}`);
          }

          if (!Array.isArray(mealPlan.foods)) {
            throw new Error(`Invalid foods array for ${day} ${meal}`);
          }

          for (const food of mealPlan.foods) {
            if (!food.name || !food.portion || !food.unit || !food.details) {
              throw new Error(`Invalid food structure in ${day} ${meal}`);
            }
          }

          if (typeof mealPlan.calories !== 'number') {
            throw new Error(`Invalid calories for ${day} ${meal}`);
          }
        }

        if (!dayPlan.totalNutrition || typeof dayPlan.totalNutrition.calories !== 'number') {
          throw new Error(`Invalid totalNutrition for ${day}`);
        }
      }

      if (!weeklyPlan.recommendations ||
          typeof weeklyPlan.recommendations.general !== 'string' ||
          typeof weeklyPlan.recommendations.preworkout !== 'string' ||
          typeof weeklyPlan.recommendations.postworkout !== 'string') {
        throw new Error('Invalid recommendations structure');
      }

      console.log('Validation successful, returning plan');
      return new Response(
        JSON.stringify(weeklyPlan),
        { status: 200, headers: corsHeaders }
      );

    } catch (error) {
      console.error('Error processing meal plan:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to process meal plan: ' + error.message }), 
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }), 
      { status: 500, headers: corsHeaders }
    );
  }
});
