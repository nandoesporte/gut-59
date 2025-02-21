
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

    const systemPrompt = `You are a nutrition expert API that returns ONLY raw JSON, no markdown formatting or explanation text.
    Create a weekly meal plan in Portuguese using ONLY the provided foods.
    The response must be a valid JSON object with this exact structure:

    {
      "monday": {
        "dailyPlan": {
          "breakfast": {
            "description": "string",
            "foods": [
              {
                "name": "string",
                "portion": number,
                "unit": "string",
                "details": "string"
              }
            ],
            "calories": number,
            "macros": {
              "protein": number,
              "carbs": number,
              "fats": number,
              "fiber": number
            }
          },
          "morningSnack": { same structure as breakfast },
          "lunch": { same structure as breakfast },
          "afternoonSnack": { same structure as breakfast },
          "dinner": { same structure as breakfast }
        },
        "totalNutrition": {
          "calories": number,
          "protein": number,
          "carbs": number,
          "fats": number,
          "fiber": number
        }
      },
      [same structure for tuesday through sunday],
      "recommendations": {
        "general": "string",
        "preworkout": "string",
        "postworkout": "string",
        "timing": ["string"]
      }
    }

    Return ONLY the JSON object, with no markdown formatting or explanation text.`;

    const userPrompt = `Create a weekly meal plan with:
    Target Daily Calories: ${userData.dailyCalories}kcal
    Profile: ${userData.age} years, ${userData.gender}, ${userData.weight}kg
    Goal: ${userData.goal}
    Available Foods: ${selectedFoods.map(f => `${f.name} (${f.calories}kcal/100g, P:${f.protein}g, C:${f.carbs}g, F:${f.fats}g)`).join(', ')}
    Dietary Restrictions: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'None'}
    Allergies: ${dietaryPreferences.allergies?.join(', ') || 'None'}
    Training Time: ${dietaryPreferences.trainingTime || 'Not specified'}

    Requirements:
    1. Use ONLY the provided foods
    2. Keep daily calories close to the target
    3. Create varied meals across the week
    4. Include description and macros for each meal
    5. All numeric values must be numbers, not strings
    6. Return ONLY the raw JSON object
    7. Include timing array in recommendations`;

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
      const content = data.choices[0].message.content.trim()
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      console.log('Raw content:', content);
      const weeklyPlan = JSON.parse(content);
      console.log('Successfully parsed JSON');

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const meals = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'];

      // Validate each day's plan
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

          if (typeof mealPlan.description !== 'string') {
            throw new Error(`Missing description for ${day} ${meal}`);
          }

          if (!Array.isArray(mealPlan.foods)) {
            throw new Error(`Invalid foods array for ${day} ${meal}`);
          }

          for (const food of mealPlan.foods) {
            if (!food.name || typeof food.portion !== 'number' || !food.unit || !food.details) {
              throw new Error(`Invalid food structure in ${day} ${meal}`);
            }
          }

          if (typeof mealPlan.calories !== 'number') {
            throw new Error(`Invalid calories for ${day} ${meal}`);
          }

          const macros = mealPlan.macros;
          if (!macros || 
              typeof macros.protein !== 'number' ||
              typeof macros.carbs !== 'number' ||
              typeof macros.fats !== 'number' ||
              typeof macros.fiber !== 'number') {
            throw new Error(`Invalid macros for ${day} ${meal}`);
          }
        }

        const nutrition = dayPlan.totalNutrition;
        if (!nutrition || 
            typeof nutrition.calories !== 'number' ||
            typeof nutrition.protein !== 'number' ||
            typeof nutrition.carbs !== 'number' ||
            typeof nutrition.fats !== 'number' ||
            typeof nutrition.fiber !== 'number') {
          throw new Error(`Invalid totalNutrition for ${day}`);
        }
      }

      if (!weeklyPlan.recommendations ||
          typeof weeklyPlan.recommendations.general !== 'string' ||
          typeof weeklyPlan.recommendations.preworkout !== 'string' ||
          typeof weeklyPlan.recommendations.postworkout !== 'string' ||
          !Array.isArray(weeklyPlan.recommendations.timing)) {
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
