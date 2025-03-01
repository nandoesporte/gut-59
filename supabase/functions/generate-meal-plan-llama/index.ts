
import { createClient } from '@supabase/supabase-js';

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Main entry point for the Supabase Edge function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const requestData = await req.json();
    console.log('Request received:', JSON.stringify(requestData, null, 2).substring(0, 1000) + '...');

    // Extract data needed for processing
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences, modelConfig } = requestData;

    if (!userData || !selectedFoods) {
      throw new Error('Invalid request: missing required data');
    }

    // Set up Supabase client for database interactions if needed
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log the received data
    console.log('Processing meal plan for user:', userData.userId);
    console.log('Selected foods count:', selectedFoods.length);
    console.log('Dietary preferences:', JSON.stringify(dietaryPreferences, null, 2));

    // Check if Groq API key is available (for Llama model)
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      console.error('Error: GROQ_API_KEY environment variable not set');
      throw new Error('API key for LLM service not configured');
    }

    // Log the model configuration
    console.log('Using model config:', JSON.stringify(modelConfig || { model: "llama-3.2-1b-chat", provider: "groq" }, null, 2));
    
    // Prepare model parameters
    const modelName = (modelConfig?.model || "llama-3.2-1b-chat").toString();
    console.log(`Using model: ${modelName}`);

    // Organize foods by meal type for better planning
    console.log('Foods by meal type available:', !!foodsByMealType);
    let organizedFoods = foodsByMealType || {};
    
    // Create a fallback meal plan if LLM generation fails
    console.log('Creating meal plan...');
    
    try {
      // Call Groq API to generate meal plan with Llama model
      const mealPlan = await generateMealPlanWithLlama(
        userData,
        selectedFoods,
        organizedFoods,
        dietaryPreferences,
        groqApiKey,
        modelName
      );

      console.log('Meal plan generation completed successfully');
      
      // Return the generated meal plan
      return new Response(
        JSON.stringify({ 
          mealPlan,
          success: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (llmError) {
      console.error('LLM generation error:', llmError);
      
      // Create a fallback meal plan with basic structure
      const fallbackPlan = createFallbackMealPlan(userData, selectedFoods, organizedFoods);
      console.log('Using fallback meal plan due to LLM error');
      
      return new Response(
        JSON.stringify({ 
          mealPlan: fallbackPlan,
          success: false,
          error: `LLM generation failed: ${llmError.message}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({
        error: `Error processing request: ${error.message}`,
        success: false,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Main function to generate meal plan using Llama 3.2 via Groq API
async function generateMealPlanWithLlama(
  userData: any,
  selectedFoods: any[],
  foodsByMealType: any,
  dietaryPreferences: any,
  apiKey: string,
  modelName: string
) {
  console.log('Starting LLM generation with Llama model...');
  
  // Prepare a simplified list of foods for the prompt
  const simplifiedFoods = selectedFoods.map(food => ({
    name: food.name,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fats: food.fats,
    food_group_id: food.food_group_id
  }));

  // Create a summary of available foods by meal type
  const mealTypeSummary = Object.entries(foodsByMealType).map(([type, foods]: [string, any]) => 
    `${type}: ${(foods as any[]).map(f => f.name).join(', ')}`
  ).join('\n');

  // Get allergies and restrictions
  const allergies = dietaryPreferences?.allergies?.join(', ') || 'None';
  const restrictions = dietaryPreferences?.dietaryRestrictions?.join(', ') || 'None';
  
  // Create the prompt for Llama
  const prompt = `You are a professional nutritionist tasked with creating a personalized 7-day meal plan.

USER INFORMATION:
- Weight: ${userData.weight}kg
- Height: ${userData.height}cm
- Age: ${userData.age}
- Gender: ${userData.gender}
- Activity level: ${userData.activityLevel}
- Goal: ${userData.goal}
- Daily calorie target: ${userData.dailyCalories} kcal
${dietaryPreferences?.trainingTime ? `- Training time: ${dietaryPreferences.trainingTime}` : ''}

DIETARY CONSIDERATIONS:
- Allergies: ${allergies}
- Dietary restrictions: ${restrictions}

AVAILABLE FOODS BY MEAL TYPE:
${mealTypeSummary}

Using ONLY the foods listed above, create a complete 7-day meal plan with 5 meals per day (breakfast, morning snack, lunch, afternoon snack, dinner).

For each day, include:
1. A brief description for each meal
2. List of foods with portions
3. Calorie and macronutrient totals per meal
4. Daily nutrition totals

Also provide:
1. Weekly average nutrition totals
2. General nutrition recommendations
3. Pre-workout and post-workout nutrition advice
4. Meal timing recommendations

Structure your response as a JSON object with the format provided below without any additional explanations:

{
  "weeklyPlan": {
    "monday": {
      "dayName": "Monday",
      "meals": {
        "breakfast": {
          "description": "...",
          "foods": [
            { "name": "...", "portion": 100, "unit": "g", "details": "..." }
          ],
          "calories": 500,
          "macros": { "protein": 30, "carbs": 60, "fats": 15, "fiber": 5 }
        },
        "morningSnack": { ... },
        "lunch": { ... },
        "afternoonSnack": { ... },
        "dinner": { ... }
      },
      "dailyTotals": { "calories": 2000, "protein": 120, "carbs": 240, "fats": 60, "fiber": 25 }
    },
    "tuesday": { ... },
    "wednesday": { ... },
    "thursday": { ... },
    "friday": { ... },
    "saturday": { ... },
    "sunday": { ... }
  },
  "weeklyTotals": {
    "averageCalories": 2000,
    "averageProtein": 120,
    "averageCarbs": 240,
    "averageFats": 60,
    "averageFiber": 25
  },
  "recommendations": {
    "general": "...",
    "preworkout": "...",
    "postworkout": "...",
    "timing": ["...", "...", "..."]
  }
}

Only return the JSON object, no other text.`;

  console.log('Prompt created, sending to Llama model...');
  
  try {
    // Call Groq API with Llama model
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a professional nutritionist AI assistant that creates personalized meal plans based on user data and preferences. You always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('API response received, extracting content...');
    
    // Extract the content from the API response
    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in API response');
    }
    
    try {
      // Parse the JSON response
      let mealPlanData;
      if (typeof content === 'string') {
        mealPlanData = JSON.parse(content);
      } else {
        mealPlanData = content;
      }
      
      console.log('Successfully parsed meal plan JSON');
      
      // Validate the meal plan structure
      validateMealPlanStructure(mealPlanData);
      
      // Add user calories to the meal plan
      mealPlanData.userCalories = userData.dailyCalories;
      
      return mealPlanData;
    } catch (parseError) {
      console.error('Error parsing API response:', parseError);
      console.log('Raw content:', content);
      throw new Error(`Failed to parse meal plan: ${parseError.message}`);
    }
  } catch (apiError) {
    console.error('API call error:', apiError);
    throw new Error(`Failed to generate meal plan: ${apiError.message}`);
  }
}

// Validate the meal plan has the expected structure
function validateMealPlanStructure(mealPlan: any) {
  if (!mealPlan.weeklyPlan) {
    throw new Error('Missing weeklyPlan in response');
  }
  
  const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of requiredDays) {
    if (!mealPlan.weeklyPlan[day]) {
      throw new Error(`Missing day: ${day} in weeklyPlan`);
    }
    
    const dayPlan = mealPlan.weeklyPlan[day];
    if (!dayPlan.meals) {
      throw new Error(`Missing meals for ${day}`);
    }
    
    const requiredMeals = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'];
    for (const meal of requiredMeals) {
      if (!dayPlan.meals[meal]) {
        throw new Error(`Missing meal: ${meal} for ${day}`);
      }
    }
  }
  
  if (!mealPlan.weeklyTotals) {
    throw new Error('Missing weeklyTotals in response');
  }
  
  if (!mealPlan.recommendations) {
    throw new Error('Missing recommendations in response');
  }
  
  console.log('Meal plan structure validated successfully');
}

// Create a fallback meal plan if LLM generation fails
function createFallbackMealPlan(userData: any, selectedFoods: any[], foodsByMealType: any) {
  console.log('Creating fallback meal plan...');
  
  const dailyCalories = userData.dailyCalories || 2000;
  const protein = Math.round(dailyCalories * 0.3 / 4); // 30% protein (4 cal/g)
  const carbs = Math.round(dailyCalories * 0.45 / 4);  // 45% carbs (4 cal/g)
  const fats = Math.round(dailyCalories * 0.25 / 9);   // 25% fats (9 cal/g)
  
  // Distribution by meal
  const breakfastCals = Math.round(dailyCalories * 0.25);
  const lunchCals = Math.round(dailyCalories * 0.35);
  const dinnerCals = Math.round(dailyCalories * 0.25);
  const snackCals = Math.round(dailyCalories * 0.15);
  
  // Create weekly plan
  const weeklyPlan: any = {};
  
  const dayNames = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday"
  };
  
  // Get some foods for each meal type
  const getRandomFood = (foods: any[], count: number = 1) => {
    if (!foods || foods.length === 0) return [{ 
      name: "Meal option", 
      portion: 100, 
      unit: "g", 
      details: "Consult a nutritionist" 
    }];
    
    const shuffled = [...foods].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, foods.length));
    
    return selected.map(food => ({
      name: food.name,
      portion: food.portion || 100,
      unit: food.portionUnit || "g",
      details: `Contains approximately ${food.calories} calories`
    }));
  };
  
  // Create meal plan for each day
  Object.entries(dayNames).forEach(([day, dayName]) => {
    weeklyPlan[day] = {
      dayName,
      meals: {
        breakfast: {
          foods: getRandomFood(foodsByMealType.breakfast || selectedFoods.slice(0, 3), 3),
          calories: breakfastCals,
          macros: {
            protein: Math.round(protein * 0.25),
            carbs: Math.round(carbs * 0.3),
            fats: Math.round(fats * 0.2),
            fiber: 5
          },
          description: `Balanced breakfast with approximately ${breakfastCals} calories.`
        },
        morningSnack: {
          foods: getRandomFood(foodsByMealType.snack || selectedFoods.slice(3, 5), 2),
          calories: Math.round(snackCals / 2),
          macros: {
            protein: Math.round(protein * 0.1),
            carbs: Math.round(carbs * 0.1),
            fats: Math.round(fats * 0.05),
            fiber: 3
          },
          description: `Light morning snack with approximately ${Math.round(snackCals/2)} calories.`
        },
        lunch: {
          foods: getRandomFood(foodsByMealType.lunch || selectedFoods.slice(5, 9), 4),
          calories: lunchCals,
          macros: {
            protein: Math.round(protein * 0.4),
            carbs: Math.round(carbs * 0.35),
            fats: Math.round(fats * 0.25),
            fiber: 8
          },
          description: `Nutritious lunch with approximately ${lunchCals} calories.`
        },
        afternoonSnack: {
          foods: getRandomFood(foodsByMealType.snack || selectedFoods.slice(9, 11), 2),
          calories: Math.round(snackCals / 2),
          macros: {
            protein: Math.round(protein * 0.05),
            carbs: Math.round(carbs * 0.1),
            fats: Math.round(fats * 0.2),
            fiber: 3
          },
          description: `Afternoon snack with approximately ${Math.round(snackCals/2)} calories.`
        },
        dinner: {
          foods: getRandomFood(foodsByMealType.dinner || selectedFoods.slice(11, 14), 3),
          calories: dinnerCals,
          macros: {
            protein: Math.round(protein * 0.2),
            carbs: Math.round(carbs * 0.15),
            fats: Math.round(fats * 0.3),
            fiber: 6
          },
          description: `Light dinner with approximately ${dinnerCals} calories.`
        }
      },
      dailyTotals: {
        calories: dailyCalories,
        protein,
        carbs,
        fats,
        fiber: 25
      }
    };
  });
  
  // Create recommendations based on user goal
  const getRecommendations = (goal: string) => {
    const general = "Stay hydrated by drinking at least 2 liters of water daily. Choose whole foods over processed options whenever possible. Include a variety of colorful fruits and vegetables in your diet.";
    const preworkout = "Consume a meal rich in carbohydrates and moderate in protein 1-2 hours before training. Good options include sweet potato with chicken, whole grain bread with eggs, or banana with peanut butter.";
    const postworkout = "After training, consume a combination of proteins and carbohydrates to aid muscle recovery. Whey protein with banana, yogurt with fruits, or chicken breast with rice are excellent options.";
    const timing = [
      "Have breakfast within 1 hour after waking up.",
      "Maintain a 3-4 hour interval between main meals.",
      "Avoid heavy meals 2-3 hours before bedtime."
    ];
    
    return {
      general,
      preworkout,
      postworkout,
      timing
    };
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
    recommendations: getRecommendations(userData.goal)
  };
}
