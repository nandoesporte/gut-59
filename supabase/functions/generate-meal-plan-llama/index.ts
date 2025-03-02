
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const LLAMA_API_KEY = Deno.env.get("LLAMA_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("LlamaAPI Function for Meal Plan Generation - Request received");

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqData = await req.json();
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = reqData;

    console.log("Processing request with LlamaAPI for model: Nous-Hermes-2-Mixtral-8x7B-DPO");
    console.log("User calories target:", userData.dailyCalories);
    console.log("Selected foods count:", selectedFoods?.length || 0);
    console.log("Dietary restrictions:", dietaryPreferences?.dietaryRestrictions?.length || 0);

    if (!LLAMA_API_KEY) {
      console.error("LlamaAPI key not found in environment variables");
      throw new Error("LlamaAPI key not configured");
    }

    // Format the prompt for diet plan generation
    const systemPrompt = `You are a professional nutritionist specialized in creating personalized meal plans. 
Your task is to create a detailed 7-day meal plan based on the user's information, food preferences, and dietary goals.`;

    // Create a well-structured user prompt with all needed information
    const userPrompt = createDetailedPrompt(userData, selectedFoods, foodsByMealType, dietaryPreferences);

    console.log("Sending request to LlamaAPI");

    // Make request to LlamaAPI
    const response = await fetch("https://api.llama-api.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: "nous-hermes-2-mixtral-8x7b-dpo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LlamaAPI Error (${response.status}):`, errorText);
      throw new Error(`LlamaAPI request failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("LlamaAPI response received");

    if (!result.choices || result.choices.length === 0) {
      console.error("LlamaAPI returned empty choices array:", result);
      throw new Error("No content generated by LlamaAPI");
    }

    let mealPlanContent;
    try {
      const content = result.choices[0].message.content;
      console.log("LlamaAPI content type:", typeof content);
      
      // Try to parse the response as JSON if it's a string
      mealPlanContent = typeof content === 'string' ? JSON.parse(content) : content;
      
      // Process the meal plan response
      const processedMealPlan = processLlamaApiResponse(mealPlanContent, userData.dailyCalories);
      console.log("Meal plan processed successfully");
      
      return new Response(JSON.stringify({ mealPlan: processedMealPlan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (parseError) {
      console.error("Error parsing LlamaAPI response:", parseError);
      console.error("Raw response:", result.choices[0].message.content);
      throw new Error("Failed to parse meal plan from LlamaAPI response");
    }
  } catch (error) {
    console.error("Error in generate-meal-plan-llama:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while generating the meal plan",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Create a detailed, structured prompt for the meal plan
function createDetailedPrompt(userData, selectedFoods, foodsByMealType, dietaryPreferences) {
  const dailyCalories = userData.dailyCalories || 2000;
  const goal = userData.goal || "maintain";
  
  // Format selected foods for better readability
  const formattedFoods = selectedFoods.map(food => {
    return `- ${food.name} (${food.calories} kcal, Protein: ${food.protein}g, Carbs: ${food.carbs}g, Fats: ${food.fats}g)`;
  }).join("\n");

  // Create meal type sections if available
  let mealTypeSection = "";
  if (foodsByMealType) {
    Object.entries(foodsByMealType).forEach(([mealType, foods]) => {
      if (foods && foods.length > 0) {
        mealTypeSection += `\n${mealType.toUpperCase()} FOODS:\n`;
        foods.forEach(food => {
          mealTypeSection += `- ${food.name} (${food.calories} kcal)\n`;
        });
      }
    });
  }

  // Format dietary restrictions and allergies
  const restrictions = dietaryPreferences.dietaryRestrictions?.join(", ") || "None";
  const allergies = dietaryPreferences.hasAllergies ? dietaryPreferences.allergies?.join(", ") : "None";
  const trainingTime = dietaryPreferences.trainingTime || "Not specified";

  // Create the full prompt
  return `
Please create a detailed, nutritionally balanced 7-day meal plan for me based on the following information:

USER INFORMATION:
- Weight: ${userData.weight} kg
- Height: ${userData.height} cm
- Age: ${userData.age} years
- Gender: ${userData.gender}
- Activity Level: ${userData.activityLevel}
- Daily Caloric Target: ${dailyCalories} calories
- Goal: ${goal}

DIETARY CONSIDERATIONS:
- Dietary Restrictions: ${restrictions}
- Allergies: ${allergies}
- Workout/Training time: ${trainingTime}

PREFERRED FOODS:
${formattedFoods}
${mealTypeSection}

INSTRUCTIONS:
1. Create a full 7-day meal plan with breakfast, morning snack, lunch, afternoon snack, and dinner for each day.
2. Each meal should include specific foods, portion sizes, and the macronutrient breakdown (protein, carbs, fats).
3. The total daily calories should be approximately ${dailyCalories} calories.
4. Provide a macronutrient distribution appropriate for the user's goal (${goal}).
5. Include dietary recommendations and tips specific to the user's goal.
6. Format your response as a valid JSON object with the following structure:

{
  "weeklyPlan": {
    "monday": {
      "dayName": "Segunda",
      "meals": {
        "breakfast": { 
          "foods": [{"name": "food name", "portion": number, "unit": "g/ml/unit", "details": "optional description"}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        },
        "morningSnack": {...},
        "lunch": {...},
        "afternoonSnack": {...},
        "dinner": {...}
      },
      "dailyTotals": {"calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number}
    },
    "tuesday": {...},
    "wednesday": {...},
    "thursday": {...},
    "friday": {...},
    "saturday": {...},
    "sunday": {...}
  },
  "weeklyTotals": {
    "averageCalories": number,
    "averageProtein": number,
    "averageCarbs": number,
    "averageFats": number,
    "averageFiber": number
  },
  "recommendations": {
    "general": "string with general nutrition advice",
    "preworkout": "string with pre-workout nutrition advice",
    "postworkout": "string with post-workout nutrition advice",
    "timing": ["array", "of", "meal", "timing", "recommendations"]
  }
}

Prioritize using the foods from the preferred foods list, especially respecting the meal type categorization if provided.
`;
}

// Process and validate the LlamaAPI response
function processLlamaApiResponse(response, targetCalories) {
  console.log("Processing LlamaAPI response");
  
  // Extract meal plan data from the response
  let mealPlan = response;
  
  // If the response has a nested structure, try to extract the meal plan
  if (response.mealPlan) {
    mealPlan = response.mealPlan;
  } else if (response.data && response.data.mealPlan) {
    mealPlan = response.data.mealPlan;
  }
  
  // Ensure weeklyPlan exists
  if (!mealPlan.weeklyPlan) {
    console.warn("Response missing weeklyPlan, creating default structure");
    mealPlan.weeklyPlan = {
      monday: createDefaultDay("Segunda", targetCalories),
      tuesday: createDefaultDay("Terça", targetCalories),
      wednesday: createDefaultDay("Quarta", targetCalories),
      thursday: createDefaultDay("Quinta", targetCalories),
      friday: createDefaultDay("Sexta", targetCalories),
      saturday: createDefaultDay("Sábado", targetCalories),
      sunday: createDefaultDay("Domingo", targetCalories)
    };
  }
  
  // Ensure all days of the week exist
  const requiredDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayNames = {
    monday: "Segunda",
    tuesday: "Terça",
    wednesday: "Quarta",
    thursday: "Quinta",
    friday: "Sexta",
    saturday: "Sábado",
    sunday: "Domingo"
  };
  
  requiredDays.forEach(day => {
    if (!mealPlan.weeklyPlan[day]) {
      console.warn(`Missing ${day} in meal plan, creating default`);
      mealPlan.weeklyPlan[day] = createDefaultDay(dayNames[day], targetCalories);
    }
  });
  
  // Create weeklyTotals if missing
  if (!mealPlan.weeklyTotals) {
    console.warn("Missing weeklyTotals, calculating from days");
    mealPlan.weeklyTotals = calculateWeeklyTotals(mealPlan.weeklyPlan);
  }
  
  // Create recommendations if missing
  if (!mealPlan.recommendations) {
    console.warn("Missing recommendations, creating defaults");
    mealPlan.recommendations = {
      general: "Mantenha uma alimentação balanceada com proteínas, carboidratos complexos e gorduras saudáveis.",
      preworkout: "Consuma carboidratos de fácil digestão 30-60 minutos antes do treino.",
      postworkout: "Consuma proteínas e carboidratos até 30 minutos após o treino para melhor recuperação.",
      timing: [
        "Tente manter um intervalo de 3-4 horas entre as refeições principais.",
        "Evite refeições pesadas antes de dormir.",
        "Beba água regularmente ao longo do dia."
      ]
    };
  }
  
  // Set userCalories if missing
  if (!mealPlan.userCalories) {
    mealPlan.userCalories = targetCalories;
  }
  
  return mealPlan;
}

// Create a default day structure
function createDefaultDay(dayName, targetCalories) {
  const breakfastCals = Math.round(targetCalories * 0.25);
  const morningSnackCals = Math.round(targetCalories * 0.1);
  const lunchCals = Math.round(targetCalories * 0.3);
  const afternoonSnackCals = Math.round(targetCalories * 0.1);
  const dinnerCals = Math.round(targetCalories * 0.25);
  
  return {
    dayName: dayName,
    meals: {
      breakfast: createDefaultMeal("Café da Manhã", breakfastCals),
      morningSnack: createDefaultMeal("Lanche da Manhã", morningSnackCals),
      lunch: createDefaultMeal("Almoço", lunchCals),
      afternoonSnack: createDefaultMeal("Lanche da Tarde", afternoonSnackCals),
      dinner: createDefaultMeal("Jantar", dinnerCals)
    },
    dailyTotals: {
      calories: targetCalories,
      protein: Math.round(targetCalories * 0.3 / 4), // 30% of calories from protein
      carbs: Math.round(targetCalories * 0.4 / 4),   // 40% of calories from carbs
      fats: Math.round(targetCalories * 0.3 / 9),    // 30% of calories from fats
      fiber: 25 // Default recommendation
    }
  };
}

// Create a default meal
function createDefaultMeal(mealName, calories) {
  return {
    foods: [
      { name: "Alimento recomendado", portion: 100, unit: "g", details: "Baseado nas suas preferências" }
    ],
    calories: calories,
    macros: {
      protein: Math.round(calories * 0.3 / 4),
      carbs: Math.round(calories * 0.4 / 4),
      fats: Math.round(calories * 0.3 / 9),
      fiber: Math.round(calories / 1000 * 10) // Roughly 10g fiber per 1000 calories
    }
  };
}

// Calculate weekly totals from daily plans
function calculateWeeklyTotals(weeklyPlan) {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalFiber = 0;
  let dayCount = 0;
  
  Object.values(weeklyPlan).forEach((day: any) => {
    if (day && day.dailyTotals) {
      totalCalories += day.dailyTotals.calories || 0;
      totalProtein += day.dailyTotals.protein || 0;
      totalCarbs += day.dailyTotals.carbs || 0;
      totalFats += day.dailyTotals.fats || 0;
      totalFiber += day.dailyTotals.fiber || 0;
      dayCount++;
    }
  });
  
  // Avoid division by zero
  dayCount = dayCount || 1;
  
  return {
    averageCalories: Math.round(totalCalories / dayCount),
    averageProtein: Math.round(totalProtein / dayCount),
    averageCarbs: Math.round(totalCarbs / dayCount),
    averageFats: Math.round(totalFats / dayCount),
    averageFiber: Math.round(totalFiber / dayCount)
  };
}
