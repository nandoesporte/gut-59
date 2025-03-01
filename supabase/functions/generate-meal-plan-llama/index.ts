
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Groq API configuration
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const LLAMA_MODEL = "llama-3.2-1b-chat-8k";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Meal Plan Llama Generation - Request received');
    
    // Parse the request body
    const requestData = await req.json();
    console.log('Request payload received:', JSON.stringify(requestData));
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = requestData;
    
    if (!userData || !selectedFoods) {
      console.error('Missing required data in request');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required user data or food selections'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Log input data for debugging
    console.log('User data:', JSON.stringify(userData));
    console.log('Dietary preferences:', JSON.stringify(dietaryPreferences));
    console.log(`Selected foods count: ${selectedFoods.length}`);
    
    // Generate the meal plan using Llama 3.2 1B
    const mealPlan = await generateMealPlanWithLLM(
      userData,
      selectedFoods,
      foodsByMealType,
      dietaryPreferences
    );
    
    // Add the userCalories to the response to satisfy the interface
    if (mealPlan && !mealPlan.userCalories && userData.dailyCalories) {
      mealPlan.userCalories = userData.dailyCalories;
    }
    
    // Log the successful response
    console.log('Meal plan generated successfully');
    
    return new Response(
      JSON.stringify({ 
        mealPlan,
        message: 'Meal plan generated successfully with Llama 3.2 1B'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error generating meal plan:', error);
    
    // Return a fallback meal plan in case of error
    const fallbackPlan = createFallbackMealPlan(requestData?.userData);
    
    return new Response(
      JSON.stringify({ 
        mealPlan: fallbackPlan,
        error: 'Error generating meal plan. Using fallback plan.',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Still return 200 with fallback plan
      }
    );
  }
});

// Function to generate the meal plan using LLM
async function generateMealPlanWithLLM(
  userData,
  selectedFoods,
  foodsByMealType,
  dietaryPreferences
) {
  try {
    console.log('Starting meal plan generation with Llama 3.2 1B');
    
    // Create the prompt with detailed instructions for the model
    const prompt = createPrompt(userData, selectedFoods, foodsByMealType, dietaryPreferences);
    
    // Check if we have API key for Groq
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }
    
    console.log('Sending request to Groq API with Llama 3.2 1B model');
    
    // Call Groq API with Llama 3.2 1B model
    const completion = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a professional nutritionist AI that creates personalized meal plans.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 4000
      })
    });
    
    if (!completion.ok) {
      const errorText = await completion.text();
      console.error('Groq API error:', errorText);
      throw new Error(`Groq API returned status ${completion.status}: ${errorText}`);
    }
    
    const result = await completion.json();
    console.log('Received response from Groq API');
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Invalid response format from Groq API');
    }
    
    // Parse the response to extract the meal plan
    const responseText = result.choices[0].message.content;
    console.log('Model response size:', responseText.length, 'characters');
    
    // Try to extract and parse JSON from the response
    const mealPlan = extractMealPlanFromResponse(responseText, userData.dailyCalories);
    
    // Validate the extracted meal plan
    if (!isValidMealPlan(mealPlan)) {
      console.error('Invalid meal plan structure:', JSON.stringify(mealPlan));
      throw new Error('Generated meal plan does not have the expected structure');
    }
    
    return mealPlan;
  } catch (error) {
    console.error('Error in generateMealPlanWithLLM:', error);
    throw error;
  }
}

// Function to create the prompt for the model
function createPrompt(userData, selectedFoods, foodsByMealType, dietaryPreferences) {
  const { dailyCalories, weight, height, age, gender, goal } = userData;
  
  // Format food information for the prompt
  const foodsInfo = selectedFoods.map(food => {
    return `- ${food.name}: ${food.calories} calories, ${food.protein}g protein, ${food.carbs}g carbs, ${food.fats}g fats${food.fiber ? `, ${food.fiber}g fiber` : ''}`;
  }).join('\n');
  
  // Format meal type associations for the prompt if available
  let mealTypeInfo = '';
  if (foodsByMealType) {
    const mealTypes = Object.keys(foodsByMealType);
    if (mealTypes.length > 0) {
      mealTypeInfo = '\nFoods categorized by meal type:\n';
      
      for (const mealType of mealTypes) {
        if (foodsByMealType[mealType] && foodsByMealType[mealType].length > 0) {
          const foodNames = foodsByMealType[mealType].map(food => food.name).join(', ');
          mealTypeInfo += `- ${mealType}: ${foodNames}\n`;
        }
      }
    }
  }
  
  // Format dietary preferences for the prompt
  const allergiesInfo = dietaryPreferences.hasAllergies && dietaryPreferences.allergies.length > 0
    ? `Allergies: ${dietaryPreferences.allergies.join(', ')}\n`
    : 'No food allergies\n';
    
  const restrictionsInfo = dietaryPreferences.dietaryRestrictions && dietaryPreferences.dietaryRestrictions.length > 0
    ? `Dietary restrictions: ${dietaryPreferences.dietaryRestrictions.join(', ')}\n`
    : 'No dietary restrictions\n';
    
  const trainingTimeInfo = dietaryPreferences.trainingTime
    ? `Training time: ${dietaryPreferences.trainingTime}\n`
    : 'No specific training time\n';
  
  // Construct the full prompt
  return `Create a detailed weekly meal plan for a ${age}-year-old ${gender}, weight ${weight}kg, height ${height}cm with a daily calorie target of ${dailyCalories} calories. The goal is to ${goal === 'lose_weight' ? 'lose weight' : goal === 'gain_mass' ? 'gain muscle mass' : 'maintain weight'}.

${allergiesInfo}${restrictionsInfo}${trainingTimeInfo}

Use ONLY the following foods to create the meal plan:
${foodsInfo}
${mealTypeInfo}

The meal plan should be structured as follows:
1. A weekly plan with 7 days (monday through sunday)
2. Each day should have 5 meals: breakfast, morningSnack, lunch, afternoonSnack, and dinner
3. Each meal should list specific foods with portions in grams or units
4. Calculate calories and macros (protein, carbs, fats, fiber) for each meal
5. Calculate daily totals for each day
6. Calculate weekly averages

Include nutritional recommendations based on the user's goal.

Your response should be a structured JSON object with the following format:
{
  "weeklyPlan": {
    "monday": { 
      "dayName": "Monday",
      "meals": {
        "breakfast": { 
          "foods": [{"name": "Food name", "portion": 100, "unit": "g", "details": "Additional details"}],
          "calories": 400,
          "macros": {"protein": 20, "carbs": 40, "fats": 15, "fiber": 5},
          "description": "Meal description"
        },
        "morningSnack": { /* similar structure */ },
        "lunch": { /* similar structure */ },
        "afternoonSnack": { /* similar structure */ },
        "dinner": { /* similar structure */ }
      },
      "dailyTotals": {"calories": 2000, "protein": 150, "carbs": 200, "fats": 60, "fiber": 25}
    },
    "tuesday": { /* similar structure */ },
    /* remaining days following the same structure */
  },
  "weeklyTotals": {
    "averageCalories": 2000,
    "averageProtein": 150,
    "averageCarbs": 200,
    "averageFats": 60,
    "averageFiber": 25
  },
  "recommendations": {
    "general": "General nutrition advice",
    "preworkout": "Pre-workout nutrition advice",
    "postworkout": "Post-workout nutrition advice",
    "timing": ["Timing recommendation 1", "Timing recommendation 2"]
  }
}

Ensure all portions make sense and the daily totals match the target calories.`;
}

// Function to extract meal plan from the model's response
function extractMealPlanFromResponse(responseText, userCalories) {
  try {
    // Try to find a JSON object in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      console.log('Found JSON in response');
      
      try {
        // Parse the JSON structure
        const mealPlan = JSON.parse(jsonStr);
        
        // Add userCalories field if not present
        if (!mealPlan.userCalories && userCalories) {
          mealPlan.userCalories = userCalories;
        }
        
        return mealPlan;
      } catch (jsonError) {
        console.error('Error parsing JSON:', jsonError);
        // Fall back to simpler extraction if JSON parsing fails
      }
    }
    
    // If we couldn't extract valid JSON, return null
    console.error('Could not extract valid JSON from response');
    return null;
  } catch (error) {
    console.error('Error extracting meal plan:', error);
    return null;
  }
}

// Function to validate the meal plan structure
function isValidMealPlan(mealPlan) {
  if (!mealPlan || typeof mealPlan !== 'object') return false;
  
  // Check for weeklyPlan property
  if (!mealPlan.weeklyPlan) return false;
  
  // Check for at least one day in the weekly plan
  const days = Object.keys(mealPlan.weeklyPlan);
  if (days.length === 0) return false;
  
  // Check the structure of the first day
  const firstDay = mealPlan.weeklyPlan[days[0]];
  if (!firstDay || !firstDay.meals) return false;
  
  // Check for the presence of at least one meal in the first day
  const mealTypes = Object.keys(firstDay.meals);
  if (mealTypes.length === 0) return false;
  
  return true;
}

// Function to create a fallback meal plan in case of errors
function createFallbackMealPlan(userData) {
  const dailyCalories = userData?.dailyCalories || 2000;
  
  // Calculate basic macros
  const protein = Math.round(dailyCalories * 0.3 / 4); // 30% protein (4 cal/g)
  const carbs = Math.round(dailyCalories * 0.45 / 4);  // 45% carbs (4 cal/g)
  const fats = Math.round(dailyCalories * 0.25 / 9);   // 25% fats (9 cal/g)
  
  // Create a basic meal structure
  const createMeal = (calories, name) => ({
    foods: [{ name: "Alimentos variados", portion: 100, unit: "g", details: "Consulte um nutricionista para personalização" }],
    calories,
    macros: { 
      protein: Math.round(protein * (calories / dailyCalories)), 
      carbs: Math.round(carbs * (calories / dailyCalories)),
      fats: Math.round(fats * (calories / dailyCalories)),
      fiber: Math.round(25 * (calories / dailyCalories))
    },
    description: `${name} com aproximadamente ${calories} calorias`
  });
  
  // Create daily structure
  const createDay = (dayName) => ({
    dayName,
    meals: {
      breakfast: createMeal(Math.round(dailyCalories * 0.25), "Café da manhã"),
      morningSnack: createMeal(Math.round(dailyCalories * 0.1), "Lanche da manhã"),
      lunch: createMeal(Math.round(dailyCalories * 0.35), "Almoço"),
      afternoonSnack: createMeal(Math.round(dailyCalories * 0.1), "Lanche da tarde"),
      dinner: createMeal(Math.round(dailyCalories * 0.2), "Jantar")
    },
    dailyTotals: {
      calories: dailyCalories,
      protein,
      carbs,
      fats,
      fiber: 25
    }
  });
  
  // Create weekly plan
  const weeklyPlan = {
    monday: createDay("Segunda-feira"),
    tuesday: createDay("Terça-feira"),
    wednesday: createDay("Quarta-feira"),
    thursday: createDay("Quinta-feira"),
    friday: createDay("Sexta-feira"),
    saturday: createDay("Sábado"),
    sunday: createDay("Domingo")
  };
  
  return {
    userCalories: dailyCalories,
    weeklyPlan,
    weeklyTotals: {
      averageCalories: dailyCalories,
      averageProtein: protein,
      averageCarbs: carbs,
      averageFats: fats,
      averageFiber: 25
    },
    recommendations: {
      general: "É recomendável consultar um nutricionista para um plano personalizado baseado em suas necessidades específicas.",
      preworkout: "Consuma carboidratos de fácil digestão 30-60 minutos antes do treino para energia.",
      postworkout: "Após o treino, combine proteínas e carboidratos para recuperação muscular.",
      timing: [
        "Distribua suas refeições a cada 3-4 horas ao longo do dia.",
        "Mantenha-se hidratado bebendo pelo menos 2 litros de água diariamente."
      ]
    },
    isFallbackPlan: true
  };
}
