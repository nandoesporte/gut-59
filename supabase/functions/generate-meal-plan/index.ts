
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateMealPlan, standardizeUnits } from "./validator.ts";

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
    
    console.log('Starting meal plan generation...');
    console.log('User data:', JSON.stringify(userData));
    console.log('Selected foods count:', selectedFoods.length);

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 200, headers: corsHeaders }
      );
    }

    const systemPrompt = `You are a nutrition expert. Create a daily meal plan using ONLY the provided foods.
    Return ONLY the JSON structure, no additional text.`;

    const userPrompt = `Create a meal plan with:
    Calories: ${userData.dailyCalories}kcal
    Profile: ${userData.age}y, ${userData.gender}, ${userData.weight}kg
    Goal: ${userData.goal}
    Foods: ${selectedFoods.map(f => f.name).join(', ')}
    Restrictions: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'None'}
    Allergies: ${dietaryPreferences.allergies?.join(', ') || 'None'}`;

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
      return new Response(
        JSON.stringify({ error: 'Failed to generate meal plan' }), 
        { status: 200, headers: corsHeaders }
      );
    }

    const data = await response.json();
    console.log('Received response from OpenAI');

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid model response' }), 
        { status: 200, headers: corsHeaders }
      );
    }

    try {
      const content = data.choices[0].message.content;
      console.log('Parsing response...');
      const mealPlan = JSON.parse(content);
      const validatedPlan = validateMealPlan(mealPlan);
      console.log('Meal plan generated successfully');

      return new Response(
        JSON.stringify(validatedPlan),
        { status: 200, headers: corsHeaders }
      );

    } catch (error) {
      console.error('Error processing meal plan:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to process meal plan' }), 
        { status: 200, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), 
      { status: 200, headers: corsHeaders }
    );
  }
});
