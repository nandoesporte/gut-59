
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
      throw new Error('OpenAI API key not configured');
    }

    const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const systemPrompt = `You are a nutrition expert. Create a WEEKLY meal plan in Portuguese using ONLY the provided foods.
    Generate 7 different daily plans (one for each day of the week) while maintaining nutritional balance.
    Return ONLY a valid JSON object with this exact structure, no markdown or extra text:
    {
      "monday": {
        "dailyPlan": {
          "breakfast": { "description": "string", "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}], "calories": number, "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number} },
          "morningSnack": { "description": "string", "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}], "calories": number, "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number} },
          "lunch": { "description": "string", "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}], "calories": number, "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number} },
          "afternoonSnack": { "description": "string", "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}], "calories": number, "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number} },
          "dinner": { "description": "string", "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}], "calories": number, "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number} }
        },
        "totalNutrition": { "calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number }
      },
      "tuesday": { /* Same structure as monday */ },
      "wednesday": { /* Same structure as monday */ },
      "thursday": { /* Same structure as monday */ },
      "friday": { /* Same structure as monday */ },
      "saturday": { /* Same structure as monday */ },
      "sunday": { /* Same structure as monday */ },
      "recommendations": {
        "general": "string",
        "preworkout": "string",
        "postworkout": "string",
        "timing": ["string"]
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
    1. Create different meal combinations for each day while maintaining similar caloric and macro distributions
    2. Consider meal timing and portion sizes throughout the week
    3. Include variety in food choices to prevent monotony
    4. Maintain consistent meal structure (breakfast, snacks, lunch, dinner) but vary the specific foods
    5. Return ONLY the JSON object, no additional text or markdown formatting.`;

    console.log('Sending request to OpenAI for weekly plan...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
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
      const content = data.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim();
      console.log('Parsing weekly plan content:', content);
      
      const weeklyPlan = JSON.parse(content);
      console.log('Successfully parsed weekly meal plan');

      // Validate weekly plan structure
      const validateDayPlan = (day: string) => {
        const plan = weeklyPlan[day];
        const requiredMeals = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'];
        
        const hasDailyPlan = plan.dailyPlan && typeof plan.dailyPlan === 'object';
        const hasAllMeals = requiredMeals.every(meal => 
          plan.dailyPlan[meal] && 
          Array.isArray(plan.dailyPlan[meal].foods) &&
          typeof plan.dailyPlan[meal].calories === 'number' &&
          typeof plan.dailyPlan[meal].macros === 'object'
        );
        const hasTotalNutrition = plan.totalNutrition && typeof plan.totalNutrition === 'object';
        
        return hasDailyPlan && hasAllMeals && hasTotalNutrition;
      };

      const isValid = weekDays.every(day => validateDayPlan(day)) &&
                     weeklyPlan.recommendations &&
                     typeof weeklyPlan.recommendations === 'object';

      if (!isValid) {
        console.error('Weekly plan validation failed');
        throw new Error('Invalid weekly meal plan structure');
      }

      return new Response(
        JSON.stringify(weeklyPlan),
        { 
          status: 200, 
          headers: corsHeaders 
        }
      );

    } catch (error) {
      console.error('Error processing weekly meal plan:', error);
      throw new Error(`Failed to process weekly meal plan: ${error.message}`);
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }), 
      { 
        status: 500,
        headers: corsHeaders 
      }
    );
  }
});
