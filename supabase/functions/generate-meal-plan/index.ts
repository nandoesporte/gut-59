
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
    
    console.log('Starting weekly meal plan generation with input:', {
      userData,
      selectedFoods: selectedFoods.length,
      dietaryPreferences
    });

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Improved system prompt with exact structure matching the MealPlan type
    const systemPrompt = `You are a nutrition expert. Create a weekly meal plan in Portuguese using ONLY the provided foods.
    Generate 7 different daily plans while maintaining nutritional balance.
    Return ONLY a valid JSON object matching this EXACT structure for each day, no markdown:

    {
      "monday": {
        "dailyPlan": {
          "breakfast": {
            "description": "",
            "foods": [{"name": "", "portion": 0, "unit": "", "details": ""}],
            "calories": 0,
            "macros": {"protein": 0, "carbs": 0, "fats": 0, "fiber": 0}
          },
          "morningSnack": {
            "description": "",
            "foods": [{"name": "", "portion": 0, "unit": "", "details": ""}],
            "calories": 0,
            "macros": {"protein": 0, "carbs": 0, "fats": 0, "fiber": 0}
          },
          "lunch": {
            "description": "",
            "foods": [{"name": "", "portion": 0, "unit": "", "details": ""}],
            "calories": 0,
            "macros": {"protein": 0, "carbs": 0, "fats": 0, "fiber": 0}
          },
          "afternoonSnack": {
            "description": "",
            "foods": [{"name": "", "portion": 0, "unit": "", "details": ""}],
            "calories": 0,
            "macros": {"protein": 0, "carbs": 0, "fats": 0, "fiber": 0}
          },
          "dinner": {
            "description": "",
            "foods": [{"name": "", "portion": 0, "unit": "", "details": ""}],
            "calories": 0,
            "macros": {"protein": 0, "carbs": 0, "fats": 0, "fiber": 0}
          }
        },
        "totalNutrition": {
          "calories": 0,
          "protein": 0,
          "carbs": 0,
          "fats": 0,
          "fiber": 0
        }
      },
      "tuesday": { /* Same structure as monday */ },
      "wednesday": { /* Same structure as monday */ },
      "thursday": { /* Same structure as monday */ },
      "friday": { /* Same structure as monday */ },
      "saturday": { /* Same structure as monday */ },
      "sunday": { /* Same structure as monday */ },
      "recommendations": {
        "general": "",
        "preworkout": "",
        "postworkout": ""
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

    Important guidelines:
    1. Create different meal combinations for each day while maintaining similar caloric distributions
    2. Consider meal timing and portion sizes throughout the week
    3. Include variety in food choices to prevent monotony
    4. For each meal:
       - Include description field (brief text about the meal)
       - List foods with exact portions and units
       - Calculate total calories and macros (protein, carbs, fats, fiber)
    5. Follow the EXACT JSON structure provided, including all required fields
    6. All numeric values must be numbers, not strings
    7. Return ONLY the JSON object, no additional text`;

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
    console.log('Received response from OpenAI');

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid model response' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    try {
      const content = data.choices[0].message.content.trim();
      console.log('Parsing content...');
      
      const weeklyPlan = JSON.parse(content);
      console.log('Successfully parsed JSON');

      // Validate the complete structure
      const validateMeal = (meal: any) => {
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

      const validateDayPlan = (day: string) => {
        const plan = weeklyPlan[day];
        if (!plan || !plan.dailyPlan || !plan.totalNutrition) {
          console.error(`Missing required structure for ${day}`);
          return false;
        }

        const requiredMeals = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'];
        const mealsValid = requiredMeals.every(mealType => {
          const isValid = validateMeal(plan.dailyPlan[mealType]);
          if (!isValid) {
            console.error(`Invalid meal structure for ${day}.${mealType}`);
          }
          return isValid;
        });

        const nutritionValid = plan.totalNutrition &&
                             typeof plan.totalNutrition.calories === 'number' &&
                             typeof plan.totalNutrition.protein === 'number' &&
                             typeof plan.totalNutrition.carbs === 'number' &&
                             typeof plan.totalNutrition.fats === 'number' &&
                             typeof plan.totalNutrition.fiber === 'number';

        if (!nutritionValid) {
          console.error(`Invalid total nutrition for ${day}`);
        }

        return mealsValid && nutritionValid;
      };

      const recommendationsValid = weeklyPlan.recommendations &&
                                 typeof weeklyPlan.recommendations.general === 'string' &&
                                 typeof weeklyPlan.recommendations.preworkout === 'string' &&
                                 typeof weeklyPlan.recommendations.postworkout === 'string';

      const isValid = weekDays.every(day => validateDayPlan(day)) && recommendationsValid;

      if (!isValid) {
        console.error('Validation failed for weekly plan structure');
        return new Response(
          JSON.stringify({ error: 'Invalid meal plan structure' }), 
          { status: 500, headers: corsHeaders }
        );
      }

      console.log('Weekly plan validation successful');
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
