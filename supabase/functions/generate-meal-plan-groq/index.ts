
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

    // Prepare the prompt for Groq with clear instructions about JSON format
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

    // Make request to Groq API with improved settings
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
            content: 'You are a nutrition expert that creates personalized meal plans. You always return valid, properly formatted JSON following the requested structure precisely. Never return malformed JSON or include markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5, // Reduced temperature for more consistent, structured output
        max_tokens: 4000,
        response_format: { type: "json_object" } // Request JSON format response
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error from Groq API:', error);
      
      // If we received a JSON generation error, attempt recovery
      if (response.status === 400 && error.includes('json_validate_failed')) {
        console.log('Attempting to recover from JSON validation error...');
        
        // Retry with more restrictive JSON instructions and lower temperature
        const recoveryResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
                content: 'You are a nutrition expert that creates personalized meal plans. You MUST return ONLY valid JSON with no additional text, markdown formatting, or explanations. The JSON must strictly adhere to the requested schema.'
              },
              {
                role: 'user',
                content: `Generate a simple meal plan as valid JSON in the following format. DO NOT include markdown formatting or explanations.
                
                Required JSON structure:
                {
                  "meal_plan": {
                    "daily_calories": 2000,
                    "macro_distribution": {
                      "protein_percentage": 30,
                      "carbs_percentage": 40,
                      "fat_percentage": 30
                    },
                    "meals": [
                      {
                        "name": "Breakfast",
                        "type": "breakfast",
                        "foods": [
                          {
                            "name": "Eggs",
                            "portion": "2 large",
                            "calories": 140,
                            "protein": 12,
                            "carbs": 0,
                            "fat": 10
                          }
                        ],
                        "total_calories": 140,
                        "total_protein": 12,
                        "total_carbs": 0,
                        "total_fat": 10
                      }
                    ]
                  },
                  "shopping_list": {
                    "categories": [
                      {
                        "name": "Proteins",
                        "items": ["Eggs", "Chicken"]
                      }
                    ]
                  },
                  "recommendations": ["Eat regularly", "Stay hydrated"]
                }
                
                User preferences: ${JSON.stringify(userInput, null, 2)}`
              }
            ],
            temperature: 0.2, // Even lower temperature for more deterministic output
            max_tokens: 2000,
            response_format: { type: "json_object" }
          })
        });
        
        if (recoveryResponse.ok) {
          const recoveryData = await recoveryResponse.json();
          const recoveryContent = recoveryData.choices[0]?.message?.content;
          
          if (recoveryContent) {
            try {
              const mealPlanJson = JSON.parse(recoveryContent);
              console.log('Successfully recovered with simplified meal plan');
              
              // Store the generated meal plan in the database
              const { data: insertData, error: insertError } = await supabase
                .from('meal_plans')
                .insert({
                  user_id: user_id,
                  plan_data: mealPlanJson,
                  calories: mealPlanJson.meal_plan.daily_calories,
                  generated_at: new Date().toISOString(),
                  generated_by: 'groq-recovery'
                })
                .select('id')
                .single();

              if (insertError) {
                console.error('Error storing meal plan:', insertError);
                throw new Error('Failed to store the generated meal plan');
              }

              // Increment the meal plan generation count for this user
              await supabase.rpc('increment_nutrition_count', { user_id });

              console.log(`Recovery meal plan generated and stored with ID: ${insertData.id}`);

              return new Response(
                JSON.stringify({ 
                  success: true, 
                  mealPlan: mealPlanJson,
                  id: insertData.id,
                  recovery: true
                }),
                { 
                  headers: { 
                    ...corsHeaders,
                    'Content-Type': 'application/json' 
                  }
                }
              );
            } catch (parseError) {
              console.error('Failed to parse recovery JSON:', parseError);
            }
          }
        }
      }
      
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const groqData = await response.json();
    const mealPlanContent = groqData.choices[0]?.message?.content;
    
    if (!mealPlanContent) {
      throw new Error('No content returned from Groq API');
    }

    console.log('Successfully received response from Groq');
    
    // Extract JSON from the response
    let mealPlanJson;
    try {
      // Remove any markdown formatting if present
      const jsonContent = mealPlanContent.replace(/```json|```/g, '').trim();
      mealPlanJson = JSON.parse(jsonContent);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      console.log('Raw content (first 500 chars):', mealPlanContent.substring(0, 500));
      throw new Error('Failed to parse meal plan JSON from Groq response');
    }

    // Store the generated meal plan in the database
    const { data: insertData, error: insertError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user_id,
        plan_data: mealPlanJson,
        calories: mealPlanJson.meal_plan.daily_calories,
        generated_at: new Date().toISOString(),
        generated_by: 'groq'
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
