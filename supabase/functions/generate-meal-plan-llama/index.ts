
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers for the API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the structure of the meal plan generator request
interface MealPlanRequest {
  userData: {
    id: string;
    weight: number;
    height: number;
    age: number;
    gender: string;
    activityLevel: string;
    goal: string;
    dailyCalories: number;
  };
  preferences: {
    hasAllergies: boolean;
    allergies: string[];
    dietaryRestrictions: string[];
    trainingTime: string | null;
  };
  selectedFoods: any[];
  foodsByMealType: Record<string, string[]>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Parse the request body
    const requestData: MealPlanRequest = await req.json();
    console.log('Received request with:', JSON.stringify(requestData, null, 2));
    
    // Extract user data and preferences
    const { userData, preferences, selectedFoods, foodsByMealType } = requestData;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Prepare the prompt for the LLM
    const prompt = generateMealPlanPrompt(userData, preferences, selectedFoods, foodsByMealType);
    console.log('Generated prompt:', prompt);
    
    try {
      // Call Llama 3.2 1B model using Groq API
      console.log('Starting to generate meal plan with LLM');
      
      // Send the request to Llama model endpoint
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            { 
              role: "system", 
              content: "You are a helpful meal plan generator. Create a complete 7-day meal plan based on the user's nutritional needs and preferences."
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      
      // Process the LLM response
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error from LLM API:', errorText);
        throw new Error(`LLM API error: ${response.status} ${errorText}`);
      }
      
      const llamaResponse = await response.json();
      console.log('Received LLM response successfully');
      
      let mealPlanContent = llamaResponse.choices[0].message.content;
      console.log('Raw meal plan content:', mealPlanContent.substring(0, 200) + '...');
      
      // Try to extract JSON from the response
      let mealPlan;
      try {
        // Look for JSON in the response
        const jsonMatch = mealPlanContent.match(/```json\n([\s\S]*?)\n```/) || 
                         mealPlanContent.match(/```\n([\s\S]*?)\n```/) ||
                         mealPlanContent.match(/\{[\s\S]*\}/);
                         
        const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : mealPlanContent;
        console.log('Extracted JSON string:', jsonString.substring(0, 200) + '...');
        
        // Parse the JSON
        mealPlan = JSON.parse(jsonString.replace(/```json|```/g, '').trim());
        
        // Add user calories to the plan
        mealPlan.userCalories = userData.dailyCalories;
        
        // Validate the meal plan structure
        validateMealPlan(mealPlan);
        
        console.log('Meal plan parsed and validated successfully');
      } catch (parseError) {
        console.error('Error parsing meal plan JSON:', parseError);
        console.log('Falling back to generating a basic plan structure');
        
        // Create a basic fallback meal plan structure
        mealPlan = createFallbackMealPlan(userData.dailyCalories);
      }
      
      // Store the meal plan in the database if user is authenticated
      if (userData.id) {
        try {
          const { error } = await supabase
            .from('meal_plans')
            .insert({
              user_id: userData.id,
              plan_data: mealPlan,
              calorie_target: userData.dailyCalories,
              created_at: new Date().toISOString(),
            });
            
          if (error) {
            console.error('Error storing meal plan:', error);
          } else {
            console.log('Meal plan stored in database successfully');
          }
        } catch (dbError) {
          console.error('Database error when storing meal plan:', dbError);
        }
      }
      
      // Return the generated meal plan
      return new Response(
        JSON.stringify({ mealPlan }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (llamaError) {
      console.error('Error calling LLM:', llamaError);
      return new Response(
        JSON.stringify({ 
          error: 'Error generating meal plan', 
          message: llamaError.message,
          fallbackPlan: createFallbackMealPlan(userData.dailyCalories)
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error('General error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

// Function to generate the prompt for the LLM
function generateMealPlanPrompt(
  userData: MealPlanRequest['userData'],
  preferences: MealPlanRequest['preferences'],
  selectedFoods: any[],
  foodsByMealType: Record<string, string[]>
): string {
  const { weight, height, age, gender, activityLevel, goal, dailyCalories } = userData;
  const { hasAllergies, allergies, dietaryRestrictions, trainingTime } = preferences;
  
  // Calculate macro distributions based on goal
  let proteinPercentage, carbsPercentage, fatsPercentage;
  
  switch (goal) {
    case 'lose':
      proteinPercentage = 35;
      carbsPercentage = 35;
      fatsPercentage = 30;
      break;
    case 'gain':
      proteinPercentage = 30;
      carbsPercentage = 45;
      fatsPercentage = 25;
      break;
    default: // maintain
      proteinPercentage = 30;
      carbsPercentage = 40;
      fatsPercentage = 30;
  }
  
  // Calculate daily macros in grams
  const dailyProtein = Math.round((dailyCalories * (proteinPercentage / 100)) / 4);
  const dailyCarbs = Math.round((dailyCalories * (carbsPercentage / 100)) / 4);
  const dailyFats = Math.round((dailyCalories * (fatsPercentage / 100)) / 9);
  
  // Format selected foods info
  const foodsList = selectedFoods.map(food => 
    `${food.name}: ${food.calories} calories, ${food.protein}g protein, ${food.carbs}g carbs, ${food.fats}g fats`
  ).join('\n');
  
  // Format foods by meal type
  const mealTypeInfo = Object.entries(foodsByMealType)
    .map(([mealType, foodIds]) => {
      const foods = selectedFoods.filter(food => foodIds.includes(food.id));
      return `${mealType}: ${foods.map(f => f.name).join(', ')}`;
    })
    .join('\n');
  
  // Build the complete prompt
  return `
Create a 7-day meal plan for a person with the following characteristics:
- Weight: ${weight} kg
- Height: ${height} cm
- Age: ${age} years
- Gender: ${gender}
- Activity level: ${activityLevel}
- Goal: ${goal}
- Daily calorie target: ${dailyCalories} calories

Daily macronutrient targets:
- Protein: ${dailyProtein}g (${proteinPercentage}%)
- Carbohydrates: ${dailyCarbs}g (${carbsPercentage}%)
- Fats: ${dailyFats}g (${fatsPercentage}%)

${hasAllergies ? `Allergies: ${allergies.join(', ')}` : 'No food allergies.'}
${dietaryRestrictions.length > 0 ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}` : 'No dietary restrictions.'}
${trainingTime ? `Training time: ${trainingTime}` : 'No specific training time.'}

The meal plan should be based on these selected foods:
${foodsList}

Preferred foods for specific meal types:
${mealTypeInfo}

Please provide a structured meal plan with 5 meals per day (breakfast, morning snack, lunch, afternoon snack, dinner) for all 7 days of the week.
For each meal, include the name, portion size, and a brief description of how to prepare it.
Calculate and include the calories and macronutrients (protein, carbs, fats) for each meal.
Also provide daily totals and recommendations for optimal nutrition.

Return the meal plan as a valid JSON object with the following structure:

{
  "weeklyPlan": {
    "monday": {
      "dayName": "Monday",
      "meals": {
        "breakfast": {
          "description": "Breakfast description",
          "foods": [
            {
              "name": "Food name",
              "portion": 100,
              "unit": "g",
              "details": "Preparation details"
            }
          ],
          "calories": 500,
          "macros": {
            "protein": 30,
            "carbs": 40,
            "fats": 15,
            "fiber": 5
          }
        },
        "morningSnack": { similar structure },
        "lunch": { similar structure },
        "afternoonSnack": { similar structure },
        "dinner": { similar structure }
      },
      "dailyTotals": {
        "calories": 2000,
        "protein": 150,
        "carbs": 200,
        "fats": 55,
        "fiber": 30
      }
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
    "averageFats": 55,
    "averageFiber": 30
  },
  "recommendations": {
    "general": "General nutrition advice based on the goals",
    "preworkout": "Pre-workout nutrition advice",
    "postworkout": "Post-workout nutrition advice",
    "timing": ["Meal timing recommendation 1", "Meal timing recommendation 2"]
  }
}
`;
}

// Function to validate the meal plan structure
function validateMealPlan(mealPlan: any): void {
  // Check weeklyPlan exists
  if (!mealPlan.weeklyPlan) {
    throw new Error('Missing weeklyPlan in meal plan');
  }
  
  // Check each day exists
  const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of requiredDays) {
    if (!mealPlan.weeklyPlan[day]) {
      throw new Error(`Missing ${day} in weeklyPlan`);
    }
  }
  
  // Check recommendations exist
  if (!mealPlan.recommendations || 
      !mealPlan.recommendations.general || 
      !mealPlan.recommendations.preworkout || 
      !mealPlan.recommendations.postworkout || 
      !Array.isArray(mealPlan.recommendations.timing)) {
    throw new Error('Missing or invalid recommendations structure');
  }
  
  // Check weeklyTotals exist
  if (!mealPlan.weeklyTotals) {
    throw new Error('Missing weeklyTotals in meal plan');
  }
}

// Function to create a fallback meal plan
function createFallbackMealPlan(dailyCalories: number): any {
  const basicMealPlan = {
    userCalories: dailyCalories,
    weeklyPlan: {
      monday: createBasicDailyPlan("Monday"),
      tuesday: createBasicDailyPlan("Tuesday"),
      wednesday: createBasicDailyPlan("Wednesday"),
      thursday: createBasicDailyPlan("Thursday"),
      friday: createBasicDailyPlan("Friday"),
      saturday: createBasicDailyPlan("Saturday"),
      sunday: createBasicDailyPlan("Sunday")
    },
    weeklyTotals: {
      averageCalories: dailyCalories,
      averageProtein: Math.round((dailyCalories * 0.3) / 4), // 30% of calories from protein
      averageCarbs: Math.round((dailyCalories * 0.4) / 4),   // 40% of calories from carbs
      averageFats: Math.round((dailyCalories * 0.3) / 9),    // 30% of calories from fats
      averageFiber: 30
    },
    recommendations: {
      general: "For optimal results, focus on whole foods, adequate protein intake, and staying hydrated.",
      preworkout: "Consume a balanced meal with carbs and protein 1-2 hours before exercise.",
      postworkout: "Have a protein-rich meal or shake within 30-60 minutes after training.",
      timing: [
        "Space your meals 3-4 hours apart for better digestion and energy levels.",
        "Consider having your largest meals around your workout time."
      ]
    }
  };
  
  return basicMealPlan;
}

// Helper function to create a basic daily plan structure
function createBasicDailyPlan(dayName: string): any {
  return {
    dayName: dayName,
    meals: {
      breakfast: createBasicMeal("Breakfast"),
      morningSnack: createBasicMeal("Morning Snack"),
      lunch: createBasicMeal("Lunch"),
      afternoonSnack: createBasicMeal("Afternoon Snack"),
      dinner: createBasicMeal("Dinner")
    },
    dailyTotals: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0
    }
  };
}

// Helper function to create a basic meal structure
function createBasicMeal(description: string): any {
  return {
    description: description,
    foods: [
      {
        name: "Please try again later",
        portion: 1,
        unit: "serving",
        details: "The meal plan generation service is temporarily unavailable."
      }
    ],
    calories: 0,
    macros: {
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0
    }
  };
}
