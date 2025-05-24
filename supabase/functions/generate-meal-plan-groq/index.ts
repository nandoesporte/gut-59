
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const xaiApiKey = Deno.env.get('XAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!xaiApiKey) {
      throw new Error('Missing XAI_API_KEY environment variable');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { userInput, user_id } = await req.json();
    
    console.log(`Received meal plan generation request for user: ${user_id}`);
    console.log(`User input: ${JSON.stringify(userInput)}`);

    // Prepare the prompt for Grok-3 Mini with clear instructions about JSON format
    const prompt = `
    Create a detailed meal plan based on the following user preferences:
    
    ${JSON.stringify(userInput, null, 2)}
    
    The meal plan should:
    - Include 5-6 meals per day (breakfast, morning snack, lunch, afternoon snack, dinner, and optional evening snack)
    - Specify portion sizes and quantities
    - Include nutritional information (calories, protein, carbs, fats)
    - Consider any dietary restrictions mentioned
    - Be realistic and practical for daily preparation
    - Include a shopping list

    ABSOLUTELY CRITICAL: YOUR RESPONSE MUST BE VALID JSON. Do not include any markdown formatting, explanations, or code blocks.
    
    Format your response as valid JSON with the following structure:
    {
      "meal_plan": {
        "daily_calories": number,
        "macro_distribution": {
          "protein_percentage": number,
          "carbs_percentage": number,
          "fat_percentage": number
        },
        "meals": [
          {
            "name": string,
            "type": string,
            "foods": [
              {
                "name": string,
                "portion": string,
                "calories": number,
                "protein": number,
                "carbs": number,
                "fat": number
              }
            ],
            "total_calories": number,
            "total_protein": number,
            "total_carbs": number,
            "total_fat": number
          }
        ]
      },
      "shopping_list": {
        "categories": [
          {
            "name": string,
            "items": string[]
          }
        ]
      },
      "recommendations": string[]
    }
    
    Return only the JSON, nothing else. Do not wrap the JSON in markdown code blocks or add explanations.`;

    // Make request to xAI Grok-3 Mini API
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition expert that creates personalized meal plans. You always return valid, properly formatted JSON following the requested structure precisely. Never return malformed JSON or include markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error from xAI API:', error);
      throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
    }

    const xaiData = await response.json();
    const mealPlanContent = xaiData.choices[0]?.message?.content;
    
    if (!mealPlanContent) {
      throw new Error('No content returned from xAI API');
    }

    console.log('Successfully received response from Grok-3 Mini');
    
    // Extract JSON from the response
    let mealPlanJson;
    try {
      // Remove any markdown formatting if present
      const jsonContent = mealPlanContent.replace(/```json|```/g, '').trim();
      mealPlanJson = JSON.parse(jsonContent);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      console.log('Raw content (first 500 chars):', mealPlanContent.substring(0, 500));
      throw new Error('Failed to parse meal plan JSON from Grok-3 Mini response');
    }

    // Store the generated meal plan in the database
    const { data: insertData, error: insertError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user_id,
        plan_data: mealPlanJson,
        calories: mealPlanJson.meal_plan.daily_calories,
        generated_at: new Date().toISOString(),
        generated_by: 'grok-3-mini'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error storing meal plan:', insertError);
      throw new Error('Failed to store the generated meal plan');
    }

    // Increment the meal plan generation count for this user
    await supabase.rpc('increment_nutrition_count', { user_id });

    console.log(`Meal plan generated and stored with ID: ${insertData.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        mealPlan: mealPlanJson,
        id: insertData.id
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        fallback: true
      }),
      { 
        status: 500, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
