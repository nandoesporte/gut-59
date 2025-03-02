
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const groqApiKey = Deno.env.get('GROQ_API_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseKey)

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get request body
    const requestData = await req.json()
    
    // Validate required data - this prevents the "Insufficient data" error
    if (!requestData.userData || !requestData.selectedFoods || requestData.selectedFoods.length === 0) {
      console.error('Input validation failed:', {
        hasUserData: !!requestData.userData,
        selectedFoodsCount: requestData.selectedFoods?.length || 0
      })
      return new Response(
        JSON.stringify({ 
          error: 'Dados insuficientes para gerar o plano alimentar. Verifique se você selecionou alimentos e preencheu seus dados.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Log data received (truncated to avoid huge logs)
    console.log('Generating meal plan with Llama3-8b-8192 model via Groq')
    console.log('User data:', JSON.stringify(requestData.userData))
    console.log(`Selected foods count: ${requestData.selectedFoods.length}`)
    
    // Get the model to use - default to llama3-8b-8192
    const model = "llama3-8b-8192"
    console.log(`Using model: ${model}`)

    // Extract user data for better prompting
    const { weight, height, age, gender, activityLevel, goal, dailyCalories } = requestData.userData
    
    // Structure system prompt to guide Llama3 to generate valid JSON
    const systemPrompt = `You are a professional nutrition expert specialized in creating personalized meal plans. 
You will receive user data and food preferences, and you will create a detailed weekly meal plan.
Your output MUST be valid JSON without any markdown formatting or additional text.
The meal plan should include 7 days (Monday to Sunday) with 5 meals per day (breakfast, morningSnack, lunch, afternoonSnack, dinner).
For each meal, include foods, calories, macros (protein, carbs, fats, fiber), and a description.
Calculate daily totals and weekly averages accurately.
Include practical recommendations for the user based on their goal (${goal}) and daily calorie needs (${dailyCalories} kcal).

This is the expected structure (example):
{
  "mealPlan": {
    "weeklyPlan": {
      "monday": {
        "dayName": "Monday",
        "meals": {
          "breakfast": {
            "foods": [
              {"name": "Eggs", "portion": 100, "unit": "g", "details": "Good protein source"}
            ],
            "calories": 250,
            "macros": {"protein": 20, "carbs": 15, "fats": 10, "fiber": 2},
            "description": "Breakfast description"
          },
          "morningSnack": { ... similar structure ... },
          "lunch": { ... similar structure ... },
          "afternoonSnack": { ... similar structure ... },
          "dinner": { ... similar structure ... }
        },
        "dailyTotals": {
          "calories": 2000,
          "protein": 120,
          "carbs": 200,
          "fats": 70,
          "fiber": 30
        }
      },
      "tuesday": { ... similar structure ... },
      ... other days of the week ...
    },
    "weeklyTotals": {
      "averageCalories": 2000,
      "averageProtein": 120,
      "averageCarbs": 200,
      "averageFats": 70,
      "averageFiber": 30
    },
    "recommendations": {
      "general": "General nutrition recommendations text",
      "preworkout": "Pre-workout meal recommendations",
      "postworkout": "Post-workout meal recommendations",
      "timing": ["Timing recommendation 1", "Timing recommendation 2"]
    }
  }
}`

    // Create a concise user prompt with critical information
    const userPrompt = `Create a personalized meal plan for a ${age} year old ${gender} who weighs ${weight}kg, is ${height}cm tall, has ${activityLevel} activity level, with a goal to ${goal}, requiring approximately ${dailyCalories} calories daily.

Their food preferences and available foods are: ${requestData.selectedFoods.map(food => food.name).join(', ')}.

${requestData.dietaryPreferences ? `
Dietary restrictions: ${requestData.dietaryPreferences.dietaryRestrictions?.join(', ') || 'None'}
Allergies: ${requestData.dietaryPreferences.hasAllergies ? requestData.dietaryPreferences.allergies?.join(', ') : 'None'}
Training time: ${requestData.dietaryPreferences.trainingTime || 'Not specified'}
` : 'No specific dietary restrictions or allergies.'}

Return ONLY valid JSON without any markdown formatting, explanations, or additional text. Follow the exact structure provided in the system prompt.`

    // Make the API call to Groq with Llama3
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" } // Request specifically formatted JSON
      }),
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error('Groq API error:', result)
      throw new Error(`Groq API error: ${result.error?.message || 'Unknown error'}`)
    }

    if (!result.choices || result.choices.length === 0) {
      console.error('No choices returned from Groq:', result)
      throw new Error('No response content received from Groq API')
    }

    // Extract the model's response
    const modelResponse = result.choices[0].message.content
    console.log('Received raw response from model, parsing JSON...')
    
    try {
      // Parse the JSON response from the model
      const parsedResponse = JSON.parse(modelResponse)
      
      // Validate the parsed response
      if (!parsedResponse.mealPlan || !parsedResponse.mealPlan.weeklyPlan) {
        console.error('Invalid meal plan structure:', parsedResponse)
        throw new Error('The generated meal plan is missing required structure')
      }
      
      // Add user calories to the response
      parsedResponse.mealPlan.userCalories = dailyCalories
      
      console.log('Meal plan successfully generated and validated')
      
      // Return the meal plan
      return new Response(
        JSON.stringify({ mealPlan: parsedResponse.mealPlan }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (parseError) {
      console.error('Error parsing model response:', parseError)
      console.error('Raw model response:', modelResponse)
      throw new Error('Failed to parse the model response as JSON')
    }
  } catch (error) {
    console.error('Error in generate-meal-plan-groq:', error.message)
    
    return new Response(
      JSON.stringify({ 
        error: `Erro ao gerar plano alimentar: ${error.message}`,
        message: 'Falha ao processar seu pedido. Por favor, tente novamente.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
