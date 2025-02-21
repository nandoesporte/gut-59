
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

    const systemPrompt = `You are a nutrition expert API that returns ONLY raw JSON for a single day meal plan in Portuguese.
    The response must be a valid JSON object with this exact structure:

    {
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
      },
      "recommendations": {
        "general": "string",
        "preworkout": "string",
        "postworkout": "string",
        "timing": ["string"]
      }
    }

    Return ONLY the JSON object, no markdown or extra text.`;

    const userPrompt = `Create a daily meal plan with:
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
    3. Include description and macros for each meal
    4. All numeric values must be numbers, not strings
    5. Return ONLY the raw JSON object
    6. Include timing recommendations`;

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
      const mealPlan = JSON.parse(content);
      console.log('Successfully parsed JSON');

      const meals = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'];

      // Validate structure
      if (!mealPlan.dailyPlan) {
        throw new Error('Missing dailyPlan');
      }

      for (const meal of meals) {
        const mealData = mealPlan.dailyPlan[meal];
        if (!mealData) {
          throw new Error(`Missing ${meal}`);
        }

        if (typeof mealData.description !== 'string') {
          throw new Error(`Missing description for ${meal}`);
        }

        if (!Array.isArray(mealData.foods)) {
          throw new Error(`Invalid foods array for ${meal}`);
        }

        for (const food of mealData.foods) {
          if (!food.name || typeof food.portion !== 'number' || !food.unit || !food.details) {
            throw new Error(`Invalid food structure in ${meal}`);
          }
        }

        if (typeof mealData.calories !== 'number') {
          throw new Error(`Invalid calories for ${meal}`);
        }

        const macros = mealData.macros;
        if (!macros || 
            typeof macros.protein !== 'number' ||
            typeof macros.carbs !== 'number' ||
            typeof macros.fats !== 'number' ||
            typeof macros.fiber !== 'number') {
          throw new Error(`Invalid macros for ${meal}`);
        }
      }

      const nutrition = mealPlan.totalNutrition;
      if (!nutrition || 
          typeof nutrition.calories !== 'number' ||
          typeof nutrition.protein !== 'number' ||
          typeof nutrition.carbs !== 'number' ||
          typeof nutrition.fats !== 'number' ||
          typeof nutrition.fiber !== 'number') {
        throw new Error('Invalid totalNutrition');
      }

      if (!mealPlan.recommendations ||
          typeof mealPlan.recommendations.general !== 'string' ||
          typeof mealPlan.recommendations.preworkout !== 'string' ||
          typeof mealPlan.recommendations.postworkout !== 'string' ||
          !Array.isArray(mealPlan.recommendations.timing)) {
        throw new Error('Invalid recommendations structure');
      }

      console.log('Validation successful, returning plan');
      return new Response(
        JSON.stringify(mealPlan),
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
