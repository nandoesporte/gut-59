
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const groqApiKey = Deno.env.get('GROQ_API_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper to handle response errors
function handleError(error: Error | unknown) {
  console.error('Error details:', error)
  
  if (error instanceof Error) {
    return new Response(JSON.stringify({
      error: true,
      message: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  return new Response(JSON.stringify({
    error: true,
    message: 'Unknown error occurred',
    details: String(error)
  }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Process the meal plan response from Groq
const processMealPlanResponse = (responseText: string) => {
  console.log('Processing Groq response...')
  console.log('Response length:', responseText.length)
  
  // Add logging to check the first few characters
  console.log('Response preview:', responseText.substring(0, 200) + '...')
  
  try {
    // Sometimes Groq might return JSON with extra text before or after
    // Try to extract JSON using a regex pattern
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      console.error('No valid JSON found in response')
      throw new Error('Invalid response format from Groq: No JSON object found')
    }
    
    const jsonStr = jsonMatch[0]
    console.log('Extracted JSON (first 100 chars):', jsonStr.substring(0, 100) + '...')
    
    // Try to parse the extracted JSON
    try {
      return JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      
      // Try to clean the JSON string before parsing
      const cleanedStr = jsonStr
        .replace(/\\n/g, '\\n')
        .replace(/\\'/g, "\\'")
        .replace(/\\"/g, '\\"')
        .replace(/\\&/g, '\\&')
        .replace(/\\r/g, '\\r')
        .replace(/\\t/g, '\\t')
        .replace(/\\b/g, '\\b')
        .replace(/\\f/g, '\\f')
        .replace(/[\u0000-\u0019]+/g, '') // Remove control characters
      
      try {
        return JSON.parse(cleanedStr)
      } catch (cleanedParseError) {
        console.error('Failed to parse cleaned JSON:', cleanedParseError)
        
        // Last resort - create a basic structure as fallback
        return {
          mealPlan: {
            weeklyPlan: {},
            recommendations: {},
            error: "Failed to parse Groq response"
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing meal plan response:', error)
    throw new Error(`Failed to process Groq response: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Main function to generate a meal plan
async function generateMealPlan(req: Request) {
  console.log('Starting meal plan generation with Groq')
  
  try {
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = await req.json()
    
    if (!userData || !selectedFoods || !dietaryPreferences) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Request data received:')
    console.log('- User data:', JSON.stringify(userData).substring(0, 100) + '...')
    console.log('- Selected foods count:', selectedFoods.length)
    console.log('- Dietary preferences:', JSON.stringify(dietaryPreferences).substring(0, 100) + '...')
    
    // Limit the amount of data we send to avoid token limits
    const limitedFoods = selectedFoods.slice(0, 20).map((food: any) => ({
      id: food.id,
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      fiber: food.fiber || 0
    }))
    
    // Create the prompt for Groq
    const prompt = `
    Your task is to create a complete weekly meal plan based on the user's preferences and nutritional needs.

    USER DATA:
    Weight: ${userData.weight}kg
    Height: ${userData.height}cm
    Age: ${userData.age}
    Gender: ${userData.gender}
    Activity Level: ${userData.activityLevel}
    Goal: ${userData.goal}
    Daily Calorie Target: ${userData.dailyCalories} calories

    AVAILABLE FOODS:
    ${JSON.stringify(limitedFoods)}

    DIETARY PREFERENCES:
    ${JSON.stringify(dietaryPreferences)}

    INSTRUCTIONS:
    1. Create a balanced 7-day meal plan with 5 meals per day (breakfast, morning snack, lunch, afternoon snack, dinner)
    2. Each meal should use foods from the AVAILABLE FOODS list
    3. Distribute calories throughout the day: breakfast (25%), morning snack (10%), lunch (35%), afternoon snack (10%), dinner (20%)
    4. Respect the user's allergies and dietary restrictions
    5. Include nutritional information for each meal (calories, protein, carbs, fats, fiber)
    6. Include daily totals for calories and macronutrients
    7. Add helpful nutritional recommendations
    8. Structure your response as a valid JSON object with the following format:

    {
      "mealPlan": {
        "weeklyPlan": {
          "monday": {
            "dayName": "Monday",
            "meals": {
              "breakfast": {
                "foods": [
                  {"name": "Food Name", "portion": 100, "unit": "g", "details": "Optional details"}
                ],
                "calories": 500,
                "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5},
                "description": "Meal description"
              },
              "morningSnack": { ... similar structure ... },
              "lunch": { ... similar structure ... },
              "afternoonSnack": { ... similar structure ... },
              "dinner": { ... similar structure ... }
            },
            "dailyTotals": {"calories": 2000, "protein": 120, "carbs": 200, "fats": 60, "fiber": 25}
          },
          "tuesday": { ... similar structure ... },
          "wednesday": { ... similar structure ... },
          "thursday": { ... similar structure ... },
          "friday": { ... similar structure ... },
          "saturday": { ... similar structure ... },
          "sunday": { ... similar structure ... }
        },
        "weeklyTotals": {
          "averageCalories": 2000,
          "averageProtein": 120,
          "averageCarbs": 200,
          "averageFats": 60,
          "averageFiber": 25
        },
        "recommendations": {
          "general": "General nutrition advice",
          "preworkout": "Pre-workout nutrition advice",
          "postworkout": "Post-workout nutrition advice",
          "timing": ["Meal timing recommendation 1", "Meal timing recommendation 2"]
        }
      }
    }

    IMPORTANT: Your response MUST be a valid JSON object following exactly the structure above. Do not include any text before or after the JSON object.
    `
    
    console.log('Sending request to Groq API...')
    console.log('Prompt length:', prompt.length)
    
    // Calling the Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: 'You are a professional nutritionist expert in creating personalized meal plans. You provide your responses as strict JSON objects.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 8000
      })
    })
    
    if (!groqResponse.ok) {
      const errorData = await groqResponse.text()
      console.error('Groq API error:', errorData)
      throw new Error(`Groq API error: ${errorData}`)
    }
    
    const groqData = await groqResponse.json()
    console.log('Groq API response received')
    console.log('Response data:', JSON.stringify(groqData).substring(0, 200) + '...')
    
    if (!groqData.choices || groqData.choices.length === 0 || !groqData.choices[0].message) {
      throw new Error('Invalid response format from Groq API')
    }
    
    // Extract the content from the Groq response
    const content = groqData.choices[0].message.content
    console.log('Content type:', typeof content)
    console.log('Content preview:', content.substring(0, 200) + '...')
    
    // Process the meal plan response
    let processedData
    try {
      // First try direct JSON parsing if Groq returned clean JSON
      processedData = JSON.parse(content)
      console.log('Successfully parsed JSON directly')
    } catch (parseError) {
      console.log('Direct JSON parse failed, trying alternative processing')
      // If direct parsing fails, try the processing function
      processedData = processMealPlanResponse(content)
    }
    
    // Track the generation in the database
    try {
      await supabase
        .from('plan_generation_counts')
        .upsert({
          user_id: userData.id,
          meal_plan_count: 1
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
      
      console.log('Updated plan generation count for user:', userData.id)
    } catch (dbError) {
      console.error('Error updating plan generation count:', dbError)
      // Continue anyway, this is not critical
    }
    
    // Return the processed meal plan
    return new Response(
      JSON.stringify(processedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating meal plan:', error)
    return handleError(error)
  }
}

// Main serve function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  // Route based on the request method
  try {
    if (req.method === 'POST') {
      return await generateMealPlan(req)
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return handleError(error)
  }
})
