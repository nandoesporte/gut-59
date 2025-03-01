
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Groq } from 'https://esm.sh/@groq/groq-sdk@0.4.0'
import { corsHeaders } from '../_shared/cors.ts'

// Initialize Groq client
const groq = new Groq({
  apiKey: Deno.env.get('GROQ_API_KEY'),
})

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

Deno.serve(async (req) => {
  console.log("generate-meal-plan-groq function called at:", new Date().toISOString())
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request")
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get request body
    const requestData = await req.json()
    console.log("Request received with user ID:", requestData.userData?.userId || "No user ID provided")
    console.log("Request data structure:", Object.keys(requestData).join(", "))
    
    // Log selected foods count
    if (requestData.selectedFoods) {
      console.log(`Selected food count: ${requestData.selectedFoods.length}`)
      console.log(`First few foods: ${requestData.selectedFoods.slice(0, 3).map(f => f.name).join(', ')}...`)
    }
    
    // Log dietary preferences
    if (requestData.dietaryPreferences) {
      console.log("Dietary preferences received:", JSON.stringify({
        hasAllergies: requestData.dietaryPreferences.hasAllergies,
        allergiesCount: requestData.dietaryPreferences.allergies?.length || 0,
        dietaryRestrictionsCount: requestData.dietaryPreferences.dietaryRestrictions?.length || 0,
        trainingTime: requestData.dietaryPreferences.trainingTime
      }))
    }

    // Check for required data
    if (!requestData.userData || !requestData.selectedFoods) {
      console.error("Missing required data")
      return new Response(
        JSON.stringify({
          error: "Missing required data",
          detail: "userData and selectedFoods are required"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log("Calling Groq API for meal plan generation")
    
    // Format the prompt for Groq API with improved structure
    const prompt = `
You are a professional nutritionist and dietitian. Create a personalized weekly meal plan based on the following information:

USER INFORMATION:
- Weight: ${requestData.userData.weight} kg
- Height: ${requestData.userData.height} cm
- Age: ${requestData.userData.age} years
- Gender: ${requestData.userData.gender}
- Activity Level: ${requestData.userData.activityLevel}
- Goal: ${requestData.userData.goal}
- Daily Calorie Target: ${requestData.userData.dailyCalories} kcal

FOOD PREFERENCES:
The user has selected the following foods they like to eat:
${requestData.selectedFoods.map(food => 
  `- ${food.name} (${food.calories} kcal, Protein: ${food.protein}g, Carbs: ${food.carbs}g, Fats: ${food.fats}g)`
).join('\n')}

DIETARY RESTRICTIONS:
${requestData.dietaryPreferences?.hasAllergies ? 
  `The user has the following allergies: ${requestData.dietaryPreferences.allergies?.join(', ') || 'None specified'}` : 
  'The user has no allergies.'
}
${requestData.dietaryPreferences?.dietaryRestrictions?.length > 0 ? 
  `The user has the following dietary restrictions: ${requestData.dietaryPreferences.dietaryRestrictions.join(', ')}` : 
  'The user has no dietary restrictions.'
}
${requestData.dietaryPreferences?.trainingTime ? 
  `The user typically trains at: ${requestData.dietaryPreferences.trainingTime}` : 
  'No specific training time provided.'
}

INSTRUCTIONS:
1. Create a complete 7-day meal plan with 5 meals per day (breakfast, morning snack, lunch, afternoon snack, dinner).
2. For each meal, include:
   - A descriptive name/title for the meal
   - List of foods with portions in grams or standard units
   - Estimated calories and macronutrients (protein, carbs, fats, fiber)
   - A brief description of the meal's benefits
3. Use primarily the foods from the user's preferences, but you can add complementary foods when necessary.
4. Each day should meet the target calorie goal and have proper macronutrient distribution.
5. Provide daily nutritional totals for each day.
6. Include weekly average nutritional totals.
7. Add general recommendations, pre-workout and post-workout nutrition advice, and meal timing guidelines.
8. Format your response as a structured JSON object following this exact schema:

{
  "weeklyPlan": {
    "monday": {
      "dayName": "Segunda-feira",
      "meals": {
        "breakfast": {
          "foods": [
            { "name": "Food name", "portion": 100, "unit": "g", "details": "Description" }
          ],
          "calories": 400,
          "macros": { "protein": 20, "carbs": 40, "fats": 10, "fiber": 5 },
          "description": "Description of this meal"
        },
        "morningSnack": { similar structure },
        "lunch": { similar structure },
        "afternoonSnack": { similar structure },
        "dinner": { similar structure }
      },
      "dailyTotals": { "calories": 2000, "protein": 150, "carbs": 200, "fats": 60, "fiber": 30 }
    },
    "tuesday": { similar structure },
    "wednesday": { similar structure },
    "thursday": { similar structure },
    "friday": { similar structure },
    "saturday": { similar structure },
    "sunday": { similar structure }
  },
  "weeklyTotals": {
    "averageCalories": 2000,
    "averageProtein": 150,
    "averageCarbs": 200,
    "averageFats": 60,
    "averageFiber": 30
  },
  "recommendations": {
    "general": "General nutrition recommendations",
    "preworkout": "Pre-workout nutrition advice",
    "postworkout": "Post-workout nutrition advice",
    "timing": ["Timing recommendation 1", "Timing recommendation 2"]
  }
}

Remember to adapt the plan to the user's preferences, lifestyle, goal, and dietary restrictions.
`

    console.log("Sending prompt to Groq API, length:", prompt.length)
    
    // Call Groq API with Mixtral model
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: "You are a nutritionist specializing in personalized meal plans. Always respond with valid JSON following the exact schema specified."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" }
    })

    console.log("Received response from Groq API, processing...")
    
    try {
      // Get the response content
      const responseContent = completion.choices[0]?.message?.content || ""
      console.log("Response content length:", responseContent.length)
      
      // Parse JSON response
      let mealPlan
      try {
        mealPlan = JSON.parse(responseContent)
        console.log("Successfully parsed JSON response")
      } catch (parseError) {
        console.error("Failed to parse response as JSON", parseError)
        throw new Error("Invalid response format from AI model")
      }

      // Validate meal plan structure
      if (!mealPlan.weeklyPlan || !mealPlan.recommendations) {
        console.error("Invalid meal plan structure - missing required fields")
        throw new Error("Invalid meal plan structure")
      }

      console.log("Validation passed. Day count:", Object.keys(mealPlan.weeklyPlan).length)
      console.log("Responding with successful meal plan")
      
      // Log success to database (optional)
      try {
        const { error: logError } = await supabase
          .from('ai_generation_logs')
          .insert({
            user_id: requestData.userData.userId,
            generation_type: 'meal_plan',
            model: 'llama3-70b-8192',
            status: 'success',
            tokens_used: completion.usage?.total_tokens || 0
          })
          
        if (logError) {
          console.error("Failed to log generation to database:", logError)
        } else {
          console.log("Successfully logged generation to database")
        }
      } catch (logDbError) {
        console.error("Database logging error:", logDbError)
      }

      // Return the meal plan
      return new Response(
        JSON.stringify({ mealPlan }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (processingError) {
      console.error("Error processing model response:", processingError)
      throw processingError
    }

  } catch (error) {
    console.error("Error in generate-meal-plan-groq edge function:", error)
    
    // Log error to database
    try {
      if (requestData?.userData?.userId) {
        const { error: logError } = await supabase
          .from('ai_generation_logs')
          .insert({
            user_id: requestData.userData.userId,
            generation_type: 'meal_plan',
            model: 'llama3-70b-8192',
            status: 'error',
            error_message: error.message || 'Unknown error'
          })
          
        if (logError) {
          console.error("Failed to log error to database:", logError)
        }
      }
    } catch (logDbError) {
      console.error("Database error logging error:", logDbError)
    }

    return new Response(
      JSON.stringify({
        error: error.message || "An unknown error occurred",
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
