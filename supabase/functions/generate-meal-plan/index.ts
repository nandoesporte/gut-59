
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

interface MealPlan {
  monday: DayPlan;
  tuesday: DayPlan;
  wednesday: DayPlan;
  thursday: DayPlan;
  friday: DayPlan;
  saturday: DayPlan;
  sunday: DayPlan;
  recommendations: {
    general: string;
    preworkout: string;
    postworkout: string;
  };
}

interface DayPlan {
  dailyPlan: {
    breakfast: Meal;
    morningSnack: Meal;
    lunch: Meal;
    afternoonSnack: Meal;
    dinner: Meal;
  };
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

interface Meal {
  description: string;
  foods: Array<{
    name: string;
    portion: number;
    unit: string;
    details: string;
  }>;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

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
    You must return a JSON object with EXACTLY this structure for each day (no extra fields or missing fields allowed):

    {
      "monday": {
        "dailyPlan": {
          "breakfast": {
            "description": "string",
            "foods": [{ "name": "string", "portion": number, "unit": "string", "details": "string" }],
            "calories": number,
            "macros": { "protein": number, "carbs": number, "fats": number, "fiber": number }
          },
          "morningSnack": { /* same structure as breakfast */ },
          "lunch": { /* same structure as breakfast */ },
          "afternoonSnack": { /* same structure as breakfast */ },
          "dinner": { /* same structure as breakfast */ }
        },
        "totalNutrition": {
          "calories": number,
          "protein": number,
          "carbs": number,
          "fats": number,
          "fiber": number
        }
      },
      /* same structure for tuesday through sunday */
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
    Available Foods: ${selectedFoods.map(f => `${f.name} (${f.calories}kcal/100g, P:${f.protein}g, C:${f.carbs}g, F:${f.fats}g)`).join(', ')}
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
      
      const weeklyPlan = JSON.parse(content) as MealPlan;
      console.log('Successfully parsed JSON');

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

      // Validate meal structure
      const validateMeal = (meal: any): meal is Meal => {
        return meal &&
               typeof meal.description === 'string' &&
               Array.isArray(meal.foods) &&
               meal.foods.every((food: any) => 
                 typeof food.name === 'string' &&
                 typeof food.portion === 'number' &&
                 typeof food.unit === 'string' &&
                 typeof food.details === 'string'
               ) &&
               typeof meal.calories === 'number' &&
               meal.macros &&
               typeof meal.macros.protein === 'number' &&
               typeof meal.macros.carbs === 'number' &&
               typeof meal.macros.fats === 'number' &&
               typeof meal.macros.fiber === 'number';
      };

      // Validate each day's plan
      for (const day of days) {
        const plan = weeklyPlan[day];
        if (!plan?.dailyPlan || !plan.totalNutrition) {
          console.error(`Invalid structure for ${day}:`, plan);
          return new Response(
            JSON.stringify({ error: `Missing required data for ${day}` }), 
            { status: 500, headers: corsHeaders }
          );
        }

        // Validate each meal in the day
        const meals = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'] as const;
        for (const meal of meals) {
          if (!validateMeal(plan.dailyPlan[meal])) {
            console.error(`Invalid meal structure for ${day}.${meal}:`, plan.dailyPlan[meal]);
            return new Response(
              JSON.stringify({ error: `Invalid meal structure for ${day} ${meal}` }), 
              { status: 500, headers: corsHeaders }
            );
          }
        }

        // Validate total nutrition
        const nutrition = plan.totalNutrition;
        if (typeof nutrition.calories !== 'number' ||
            typeof nutrition.protein !== 'number' ||
            typeof nutrition.carbs !== 'number' ||
            typeof nutrition.fats !== 'number' ||
            typeof nutrition.fiber !== 'number') {
          console.error(`Invalid nutrition data for ${day}:`, nutrition);
          return new Response(
            JSON.stringify({ error: `Invalid nutrition data for ${day}` }), 
            { status: 500, headers: corsHeaders }
          );
        }
      }

      // Validate recommendations
      if (!weeklyPlan.recommendations ||
          typeof weeklyPlan.recommendations.general !== 'string' ||
          typeof weeklyPlan.recommendations.preworkout !== 'string' ||
          typeof weeklyPlan.recommendations.postworkout !== 'string') {
        console.error('Invalid recommendations:', weeklyPlan.recommendations);
        return new Response(
          JSON.stringify({ error: 'Invalid recommendations structure' }), 
          { status: 500, headers: corsHeaders }
        );
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
