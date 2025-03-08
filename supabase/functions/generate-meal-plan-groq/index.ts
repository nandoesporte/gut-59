
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
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!groqApiKey) {
      throw new Error('Missing GROQ_API_KEY environment variable');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { userInput, user_id } = await req.json();
    
    console.log(`Received meal plan generation request for user: ${user_id}`);
    console.log(`User input: ${JSON.stringify(userInput)}`);

    // Structured prompt with clear JSON format instructions
    const prompt = `
    Create a detailed meal plan based on the following user preferences:
    
    ${JSON.stringify(userInput, null, 2)}
    
    The meal plan should:
    - Include 5-6 meals per day (breakfast, morning snack, lunch, afternoon snack, dinner)
    - Specify portion sizes and quantities
    - Include nutritional information (calories, protein, carbs, fats)
    - Consider any dietary restrictions mentioned
    - Be realistic and practical for daily preparation
    - Include a shopping list

    The response format MUST be a valid JSON object with the following structure:

    {
      "weeklyPlan": {
        "monday": {
          "dayName": "Segunda-feira",
          "meals": {
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
            "morningSnack": {},
            "lunch": {},
            "afternoonSnack": {},
            "dinner": {}
          },
          "dailyTotals": {
            "calories": number,
            "protein": number,
            "carbs": number,
            "fats": number,
            "fiber": number
          }
        },
        "tuesday": {},
        "wednesday": {},
        "thursday": {},
        "friday": {},
        "saturday": {},
        "sunday": {}
      },
      "weeklyTotals": {
        "averageCalories": number,
        "averageProtein": number,
        "averageCarbs": number,
        "averageFats": number,
        "averageFiber": number
      },
      "recommendations": {
        "general": "string",
        "preworkout": "string",
        "postworkout": "string",
        "timing": ["string"]
      }
    }`;

    // Make request to Groq API with explicit JSON response format
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition expert that creates personalized meal plans. Your output will be parsed as JSON, so ensure it is valid JSON with no markdown formatting, no trailing commas, and all necessary closing brackets.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error from Groq API:', error);
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const groqData = await response.json();
    const mealPlanContent = groqData.choices[0]?.message?.content;
    
    if (!mealPlanContent) {
      throw new Error('No content returned from Groq API');
    }

    console.log('Successfully received response from Groq');
    
    // Robust JSON parsing with detailed error handling
    let mealPlanJson;
    try {
      // Handle both string and object responses
      if (typeof mealPlanContent === 'string') {
        mealPlanJson = JSON.parse(mealPlanContent);
      } else {
        mealPlanJson = mealPlanContent;
      }
      console.log('Successfully parsed JSON response');
    } catch (jsonError) {
      console.error('Failed to parse JSON directly:', jsonError);
      throw new Error('Failed to parse meal plan JSON from Groq response');
    }

    // Create a wrapper object if necessary to standardize format
    const standardizedMealPlan = mealPlanJson.weeklyPlan ? 
      mealPlanJson : 
      { mealPlan: mealPlanJson };
    
    console.log('Standardized meal plan format:', Object.keys(standardizedMealPlan));
    
    // Check for required properties to validate response structure
    if (!standardizedMealPlan.weeklyPlan && 
        !standardizedMealPlan.mealPlan?.weeklyPlan) {
      console.error('Invalid meal plan structure - missing weeklyPlan:', standardizedMealPlan);
      throw new Error('Invalid meal plan structure returned by Groq API');
    }

    // Store the generated meal plan in the database
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: user_id,
          plan_data: standardizedMealPlan,
          calories: userInput.dailyCalories || 0,
          generated_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (insertError) {
        console.error('Error storing meal plan:', insertError);
        throw new Error('Failed to store the generated meal plan');
      }
      
      console.log(`Meal plan generated and stored with ID: ${insertData?.id}`);

      // Increment the meal plan generation count for this user
      try {
        await supabase.rpc('increment_nutrition_count', { user_id });
        console.log('Incremented nutrition count for user:', user_id);
      } catch (countError) {
        console.error('Error incrementing nutrition count:', countError);
        // Continue execution even if this fails
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          mealPlan: standardizedMealPlan,
          id: insertData?.id
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          }
        }
      );
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store meal plan in database');
    }
  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred'
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
