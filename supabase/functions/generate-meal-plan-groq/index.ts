
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

    // Validate the meal plan structure
    if (!mealPlanJson.weeklyPlan) {
      console.error('Invalid meal plan structure - missing weeklyPlan:', mealPlanJson);
      throw new Error('Invalid meal plan structure returned by Groq API');
    }

    // Ensure all days are present in the weekly plan
    const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const missingDays = requiredDays.filter(day => !mealPlanJson.weeklyPlan[day]);
    
    if (missingDays.length > 0) {
      console.error(`Missing days in meal plan: ${missingDays.join(', ')}`);
      // Fill in missing days with empty structures
      missingDays.forEach(day => {
        const emptyMeal = {
          description: "Refeição não especificada",
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        };
        
        mealPlanJson.weeklyPlan[day] = {
          dayName: getDayName(day),
          meals: {
            breakfast: emptyMeal,
            morningSnack: emptyMeal,
            lunch: emptyMeal,
            afternoonSnack: emptyMeal,
            dinner: emptyMeal
          },
          dailyTotals: { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
        };
      });
    }

    // Ensure weekly totals are present
    if (!mealPlanJson.weeklyTotals) {
      console.error('Missing weeklyTotals in meal plan, calculating from daily totals');
      
      // Calculate weekly totals from daily totals
      const totals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0
      };
      
      let daysCount = 0;
      
      requiredDays.forEach(day => {
        if (mealPlanJson.weeklyPlan[day] && mealPlanJson.weeklyPlan[day].dailyTotals) {
          totals.calories += Number(mealPlanJson.weeklyPlan[day].dailyTotals.calories || 0);
          totals.protein += Number(mealPlanJson.weeklyPlan[day].dailyTotals.protein || 0);
          totals.carbs += Number(mealPlanJson.weeklyPlan[day].dailyTotals.carbs || 0);
          totals.fats += Number(mealPlanJson.weeklyPlan[day].dailyTotals.fats || 0);
          totals.fiber += Number(mealPlanJson.weeklyPlan[day].dailyTotals.fiber || 0);
          daysCount++;
        }
      });
      
      daysCount = daysCount || 1; // Avoid division by zero
      
      mealPlanJson.weeklyTotals = {
        averageCalories: Math.round(totals.calories / daysCount),
        averageProtein: Math.round(totals.protein / daysCount),
        averageCarbs: Math.round(totals.carbs / daysCount),
        averageFats: Math.round(totals.fats / daysCount),
        averageFiber: Math.round(totals.fiber / daysCount)
      };
    }

    // Ensure recommendations are present
    if (!mealPlanJson.recommendations) {
      console.error('Missing recommendations in meal plan, adding defaults');
      mealPlanJson.recommendations = {
        general: "Siga este plano alimentar de acordo com suas necessidades e preferências.",
        preworkout: "Consuma carboidratos de rápida absorção antes do treino.",
        postworkout: "Consuma proteínas e carboidratos após o treino para recuperação muscular.",
        timing: [
          "Café da manhã: Até 1 hora após acordar",
          "Lanche da manhã: 2-3 horas após o café da manhã",
          "Almoço: 2-3 horas após o lanche da manhã",
          "Lanche da tarde: 2-3 horas após o almoço",
          "Jantar: 2-3 horas após o lanche da tarde"
        ]
      };
    }

    // Store the generated meal plan in the database
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: user_id,
          plan_data: mealPlanJson,
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
          mealPlan: mealPlanJson,
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

// Helper function to get day names in Portuguese
function getDayName(day: string): string {
  const dayNames: Record<string, string> = {
    'monday': 'Segunda-feira',
    'tuesday': 'Terça-feira',
    'wednesday': 'Quarta-feira',
    'thursday': 'Quinta-feira',
    'friday': 'Sexta-feira',
    'saturday': 'Sábado',
    'sunday': 'Domingo'
  };
  
  return dayNames[day] || day;
}
