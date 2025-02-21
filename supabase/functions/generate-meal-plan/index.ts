
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    
    console.log('Starting weekly meal plan generation with input:', {
      userData,
      selectedFoods: selectedFoods.length,
      dietaryPreferences
    });

    // Validate input data
    if (!userData || !selectedFoods || !dietaryPreferences) {
      return new Response(
        JSON.stringify({ error: 'Missing required input data' }), 
        { status: 400, headers: corsHeaders }
      );
    }

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const systemPrompt = `You are a nutrition expert. Create a WEEKLY meal plan in Portuguese using ONLY the provided foods.
    Generate 7 different daily plans (one for each day of the week) while maintaining nutritional balance.
    Return ONLY a valid JSON object with this exact structure, no markdown or extra text:
    {
      "monday": {
        "dailyPlan": {
          "breakfast": { "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}], "calories": number },
          "morningSnack": { "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}], "calories": number },
          "lunch": { "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}], "calories": number },
          "afternoonSnack": { "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}], "calories": number },
          "dinner": { "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}], "calories": number }
        },
        "totalNutrition": { "calories": number }
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

    Important guidelines:
    1. Create different meal combinations for each day while maintaining similar caloric distributions
    2. Consider meal timing and portion sizes throughout the week
    3. Include variety in food choices to prevent monotony
    4. Maintain consistent meal structure (breakfast, snacks, lunch, dinner) but vary the specific foods
    5. Return ONLY the JSON object, no additional text or markdown formatting.`;

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
      const errorText = await response.text();
      console.error('OpenAI Error:', errorText);
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
      console.log('Parsing weekly plan content');
      
      const weeklyPlan = JSON.parse(content);
      console.log('Successfully parsed weekly meal plan');

      // Validate weekly plan structure
      const validateDayPlan = (day: string) => {
        const plan = weeklyPlan[day];
        if (!plan || !plan.dailyPlan || !plan.totalNutrition) return false;
        
        const requiredMeals = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'];
        return requiredMeals.every(meal => {
          const mealPlan = plan.dailyPlan[meal];
          return mealPlan && 
                 Array.isArray(mealPlan.foods) && 
                 mealPlan.foods.length > 0 && 
                 typeof mealPlan.calories === 'number';
        });
      };

      const isValid = weekDays.every(day => validateDayPlan(day)) &&
                     weeklyPlan.recommendations &&
                     typeof weeklyPlan.recommendations.general === 'string' &&
                     typeof weeklyPlan.recommendations.preworkout === 'string' &&
                     typeof weeklyPlan.recommendations.postworkout === 'string';

      if (!isValid) {
        console.error('Invalid meal plan structure:', weeklyPlan);
        return new Response(
          JSON.stringify({ error: 'Invalid meal plan structure' }), 
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify(weeklyPlan),
        { status: 200, headers: corsHeaders }
      );

    } catch (error) {
      console.error('Error processing meal plan:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to process meal plan' }), 
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
