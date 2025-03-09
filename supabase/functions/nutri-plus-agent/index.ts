
// nutri-plus-agent: Uses Groq API to analyze user data and generate personalized meal plans
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log start of process with timestamp
    const startTime = new Date().toISOString();
    console.log(`[NUTRI+] Process started at ${startTime}`);

    // Parse the request body
    const requestData = await req.json();
    
    // Validate request data
    if (!requestData || !requestData.userData) {
      console.error("[NUTRI+] Error: Invalid request data - userData missing");
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { userData, selectedFoods, foodsByMealType, dietaryPreferences, modelConfig } = requestData;
    console.log(`[NUTRI+] Data received for user: ${userData.id || 'anonymous'}`);
    console.log(`[NUTRI+] User profile: ${userData.age} years, ${userData.gender}, ${userData.weight}kg, ${userData.height}cm`);
    console.log(`[NUTRI+] Goal: ${userData.goal}, Daily calories: ${userData.dailyCalories}kcal`);
    console.log(`[NUTRI+] Selected foods: ${selectedFoods?.length || 0}`);
    console.log(`[NUTRI+] Preferences and restrictions: ${JSON.stringify(dietaryPreferences)}`);
    
    if (!selectedFoods || selectedFoods.length === 0) {
      console.error("[NUTRI+] Error: No foods selected");
      return new Response(
        JSON.stringify({ error: "No foods selected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if GROQ API key is available
    if (!GROQ_API_KEY) {
      console.error("[NUTRI+] Error: GROQ_API_KEY not found in environment variables");
      return new Response(
        JSON.stringify({ error: "API configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Prepare system message for Nutri+ agent
    const systemMessage = `You are Nutri+, a nutrition expert agent that creates personalized meal plans. 
Your task is to analyze user data and create a detailed, scientifically-based weekly meal plan.

IMPORTANT OUTPUT FORMAT RULES:
1. Your response MUST be valid JSON that can be processed with JSON.parse().
2. Your response must contain ONLY the JSON object without explanations, narratives or additional text.
3. CRITICALLY IMPORTANT: All numerical values must be numbers, not strings. For example, use "protein": 26 instead of "protein": "26g".
4. NEVER add units (like "g" or "kcal") after numerical values in the JSON. These values must be numbers only.
5. The output must follow exactly this structure:
{
  "mealPlan": {
    "weeklyPlan": {
      "monday": { /* daily plan structure */ },
      "tuesday": { /* daily plan structure */ },
      /* ... other days ... */
    },
    "weeklyTotals": { /* weekly nutritional averages */ },
    "recommendations": { /* personalized recommendations */ }
  }
}

Make sure weeklyPlan contains ALL 7 days (Monday to Sunday). Each day must have the following structure:
{
  "dayName": "Day Name",
  "meals": {
    "breakfast": {
      "description": "Breakfast description",
      "foods": [{"name": "Food name", "portion": 100, "unit": "g", "details": "Details about food preparation and consumption"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    },
    "morningSnack": {
      "description": "Morning snack description",
      "foods": [{"name": "Food name", "portion": 100, "unit": "g", "details": "Details about food preparation and consumption"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    },
    "lunch": {
      "description": "Lunch description",
      "foods": [{"name": "Food name", "portion": 100, "unit": "g", "details": "Details about food preparation and consumption"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    },
    "afternoonSnack": {
      "description": "Afternoon snack description",
      "foods": [{"name": "Food name", "portion": 100, "unit": "g", "details": "Details about food preparation and consumption"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    },
    "dinner": {
      "description": "Dinner description",
      "foods": [{"name": "Food name", "portion": 100, "unit": "g", "details": "Details about food preparation and consumption"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    }
  },
  "dailyTotals": {"calories": 2000, "protein": 120, "carbs": 180, "fats": 60, "fiber": 25}
}

IMPORTANT: Use exactly the property names specified above:
- Use "breakfast" for breakfast (not "breakfast_meal" or "morning_meal")
- Use "morningSnack" for morning snack (not "morning_snack")
- Use "lunch" for lunch
- Use "afternoonSnack" for afternoon snack (not "afternoon_snack")
- Use "dinner" for dinner

VERY IMPORTANT: Each food in the "foods" list MUST contain the "unit" field, like "g", "ml", "unidade", etc. This is required and MUST NOT be omitted.

It is ESSENTIAL that each food in the "foods" list contains detailed preparation instructions in the "details" field, explaining how the food should be prepared, cooked, or consumed.

IMPORTANT: Strictly respect the categorization of foods by meal type:
- Foods categorized as 'breakfast' should be placed ONLY in the breakfast meal
- Foods categorized as 'morning_snack' should be placed ONLY in the morning snack
- Foods categorized as 'lunch' should be placed ONLY in lunch
- Foods categorized as 'afternoon_snack' should be placed ONLY in the afternoon snack
- Foods categorized as 'dinner' should be placed ONLY in dinner

CRITICALLY IMPORTANT: All lunch and dinner meals MUST include:
1. A protein source (meat, chicken, fish, eggs, tofu, beans, etc.)
2. A carbohydrate source (rice, potatoes, pasta, sweet potatoes, etc.)
3. A vegetable/salad component (green leafy vegetables, raw vegetables, mixed salad, etc.)

These three components should be separate items in the foods list, not mixed into a single dish.

Recommendations should include:
{
  "general": "General nutrition advice",
  "preworkout": "Pre-workout nutrition advice",
  "postworkout": "Post-workout nutrition advice",
  "timing": ["Specific meal timing advice", "Another timing advice"]
}

REMEMBER: ALL NUMERICAL VALUES MUST BE INTEGERS OR DECIMALS, NOT STRINGS WITH UNITS. THIS IS A CRITICAL REQUIREMENT.`;

    // Construct user message with all relevant data
    const userMessage = `Create a personalized weekly meal plan based on this data:

USER PROFILE:
- Age: ${userData.age}
- Gender: ${userData.gender}
- Weight: ${userData.weight}kg
- Height: ${userData.height}cm
- Activity Level: ${userData.activityLevel}
- Goal: ${userData.goal}
- Daily Calorie Target: ${userData.dailyCalories}kcal

FOOD PREFERENCES:
${dietaryPreferences.hasAllergies ? `- Allergies: ${dietaryPreferences.allergies.join(', ')}` : '- No known allergies'}
${dietaryPreferences.dietaryRestrictions && dietaryPreferences.dietaryRestrictions.length > 0 ? `- Dietary Restrictions: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : '- No dietary restrictions'}
${dietaryPreferences.trainingTime ? `- Training Time: ${dietaryPreferences.trainingTime}` : '- No specific training time'}

AVAILABLE FOODS (${selectedFoods.length} total):
${selectedFoods.slice(0, 30).map(food => `- ${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, F:${food.fats}g)`).join('\n')}
${selectedFoods.length > 30 ? `\n... and ${selectedFoods.length - 30} more foods.` : ''}

${foodsByMealType ? `FOODS CATEGORIZED BY MEAL:
${Object.entries(foodsByMealType).map(([mealType, foods]) => 
  `- ${mealType}: ${Array.isArray(foods) ? foods.length : 0} foods`
).join('\n')}` : ''}

Please create a 7-day plan that:
1. Meets the ${userData.dailyCalories} daily calorie target (with a margin of +/- 100 kcal)
2. Properly distributes macronutrients (proteins, carbohydrates, fats, fiber)
3. Uses the provided available foods
4. Respects the user's food preferences and restrictions
5. Provides variety throughout the week
6. Includes all meal types: breakfast, morning snack, lunch, afternoon snack, dinner
7. IMPORTANT: For lunch and dinner, ALWAYS include three separate components: a protein source, a carbohydrate source, and a vegetable/salad component
8. Calculates calories and macros for each meal and day
9. Provides preparation details for each food
10. CRITICAL: Uses only numerical values for quantities, without adding units like "g" or "kcal"
11. For example, use "protein": 26 instead of "protein": "26g"
12. Uses the correct meal nomenclature in camelCase: "breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner" - don't use underscore versions like "morning_snack" or "afternoon_snack"
13. CRITICAL: Each food item MUST include a "unit" field with values like "g", "ml", "unidade", etc.`;

    // Track time for API call preparation
    console.log(`[NUTRI+] Preparing API call at ${new Date().toISOString()}`);

    // IMPORTANT: Force model to be llama3-8b-8192
    const modelName = "llama3-8b-8192";
    const temperature = modelConfig?.temperature || 0.3;
    
    console.log(`[NUTRI+] Using model: ${modelName} with temperature: ${temperature}`);

    // Prepare the API call to Groq
    const groqPayload = {
      model: modelName,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: temperature, 
      max_tokens: 7000,
      top_p: 0.9,
      response_format: { type: "json_object" } // Request JSON format response
    };

    console.log(`[NUTRI+] Calling Groq API with model: ${groqPayload.model}`);

    // Call the Groq API
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(groqPayload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[NUTRI+] Groq API Error (${response.status}):`, errorData);
      
      // If we received a JSON generation error, we'll try to create a fallback meal plan
      if (response.status === 400 && errorData.includes('json_validate_failed')) {
        console.log("[NUTRI+] JSON validation failed. Creating fallback meal plan...");
        
        try {
          // Create a basic fallback meal plan structure
          const fallbackMealPlan = createFallbackMealPlan(userData, selectedFoods);
          
          console.log("[NUTRI+] Fallback meal plan created successfully");
          
          return new Response(
            JSON.stringify({
              mealPlan: fallbackMealPlan,
              modelUsed: modelName,
              isFallback: true
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (fallbackError) {
          console.error("[NUTRI+] Error creating fallback meal plan:", fallbackError);
        }
      }
      
      // Return the error to the client if recovery failed
      return new Response(
        JSON.stringify({ 
          error: `API Error: ${response.status}`, 
          details: errorData,
          // Suggest alternative model next time
          suggestedModel: "llama3-70b-8192"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Get the API response
    const apiResponse = await response.json();
    console.log(`[NUTRI+] Response received from Groq API at ${new Date().toISOString()}`);
    
    // Check for valid response content
    if (!apiResponse.choices || !apiResponse.choices[0] || !apiResponse.choices[0].message) {
      console.error("[NUTRI+] Invalid API response format:", JSON.stringify(apiResponse).substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Invalid API response format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Get the model's response content
    const mealPlanContent = apiResponse.choices[0].message.content;
    
    // Ensure the response is valid JSON
    try {
      // Fix common format issues before parsing
      let formattedContent = mealPlanContent
        // Fix values with unit suffixes (like "26g" -> 26)
        .replace(/"protein":\s*"?(\d+)g"?/g, '"protein": $1')
        .replace(/"carbs":\s*"?(\d+)g"?/g, '"carbs": $1')
        .replace(/"fats":\s*"?(\d+)g"?/g, '"fats": $1')
        .replace(/"fiber":\s*"?(\d+)g"?/g, '"fiber": $1')
        .replace(/"calories":\s*"?(\d+)kcal"?/g, '"calories": $1')
        .replace(/"calories":\s*"?(\d+)\s*kcal"?/g, '"calories": $1')
        .replace(/"protein":\s*"?(\d+)\s*g"?/g, '"protein": $1')
        .replace(/"carbs":\s*"?(\d+)\s*g"?/g, '"carbs": $1')
        .replace(/"fats":\s*"?(\d+)\s*g"?/g, '"fats": $1')
        .replace(/"fiber":\s*"?(\d+)\s*g"?/g, '"fiber": $1')
        // Fix meal type naming
        .replace(/"morning_snack":/g, '"morningSnack":')
        .replace(/"afternoon_snack":/g, '"afternoonSnack":')
        .replace(/"evening_snack":/g, '"eveningSnack":')
        .replace(/"pre_workout":/g, '"preWorkout":')
        .replace(/"post_workout":/g, '"postWorkout":')
        // Fix common issues with array commas
        .replace(/,\s*\]/g, ']')         // Remove trailing commas in arrays
        .replace(/,\s*\}/g, '}')         // Remove trailing commas in objects
        .replace(/\.\.\.[\s\n]*\}/g, '}')  // Fix ellipsis in JSON
        .replace(/\.\.\.[\s\n]*\]/g, ']'); // Fix ellipsis in JSON
        
      // Add missing "unit" field to food items if needed
      formattedContent = formattedContent.replace(
        /"foods":\s*\[\s*{\s*"name":\s*"([^"]+)",\s*"portion":\s*(\d+),\s*"details":/g,
        '"foods": [{"name": "$1", "portion": $2, "unit": "g", "details":'
      );
      
      // Log size and a preview of the content
      console.log(`[NUTRI+] Response size: ${formattedContent.length} characters`);
      console.log(`[NUTRI+] Response preview: ${formattedContent.substring(0, 300)}...`);
      
      // Process function to ensure all numerical values are actually numbers
      const processNumericalValues = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        Object.keys(obj).forEach(key => {
          // If this is a macros object, ensure all values are numbers
          if (key === 'macros' && obj[key]) {
            ['protein', 'carbs', 'fats', 'fiber'].forEach(macro => {
              if (obj[key][macro] !== undefined) {
                // If it's a string potentially with unit (e.g. "26g"), convert to number
                if (typeof obj[key][macro] === 'string') {
                  const numValue = parseInt(obj[key][macro].replace(/[^\d.]/g, ''), 10);
                  if (!isNaN(numValue)) obj[key][macro] = numValue;
                }
              }
            });
          }
          
          // For calories and dailyTotals
          if ((key === 'dailyTotals') && obj[key] && typeof obj[key] === 'object') {
            ['calories', 'protein', 'carbs', 'fats', 'fiber'].forEach(nutrient => {
              if (obj[key][nutrient] !== undefined) {
                // If it's a string potentially with unit, convert to number
                if (typeof obj[key][nutrient] === 'string') {
                  const numValue = parseInt(obj[key][nutrient].replace(/[^\d.]/g, ''), 10);
                  if (!isNaN(numValue)) obj[key][nutrient] = numValue;
                }
              }
            });
          } else if (key === 'calories' && typeof obj[key] === 'string') {
            // Direct calories property as string (e.g., "500kcal")
            const numValue = parseInt(obj[key].replace(/[^\d.]/g, ''), 10);
            if (!isNaN(numValue)) obj[key] = numValue;
          }
          
          // Process weeklyTotals
          if (key === 'weeklyTotals' && obj[key]) {
            ['averageCalories', 'averageProtein', 'averageCarbs', 'averageFats', 'averageFiber'].forEach(avg => {
              if (obj[key][avg] !== undefined) {
                if (typeof obj[key][avg] === 'string') {
                  const numValue = parseInt(obj[key][avg].replace(/[^\d.]/g, ''), 10);
                  if (!isNaN(numValue)) obj[key][avg] = numValue;
                }
              }
            });
          }
          
          // Also check for numbers in dailyTotals directly
          if (key === 'dailyTotals' && obj[key]) {
            for (const nutrient in obj[key]) {
              if (typeof obj[key][nutrient] === 'string') {
                // Remove any non-numeric characters (like 'g' or 'kcal')
                const numericValue = parseFloat(obj[key][nutrient].replace(/[^\d.]/g, ''));
                if (!isNaN(numericValue)) {
                  obj[key][nutrient] = numericValue;
                }
              }
            }
          }
          
          // Check for foods without unit and fix them
          if (key === 'foods' && Array.isArray(obj[key])) {
            obj[key].forEach(food => {
              if (food && food.portion !== undefined && food.unit === undefined) {
                food.unit = "g"; // Default unit if missing
              }
            });
          }
          
          // Recursively process child objects and arrays
          if (obj[key] && typeof obj[key] === 'object') {
            processNumericalValues(obj[key]);
          }
        });
        
        return obj;
      };
      
      // Parse and validate the JSON response
      const mealPlanJson = JSON.parse(formattedContent);
      
      // Process all numerical values in the meal plan
      const processedMealPlan = processNumericalValues(mealPlanJson);
      
      // Validate the structure
      if (!processedMealPlan.mealPlan || !processedMealPlan.mealPlan.weeklyPlan) {
        console.error("[NUTRI+] API response missing required structure. Response:", formattedContent.substring(0, 500));
        
        // Create fallback meal plan
        const fallbackMealPlan = createFallbackMealPlan(userData, selectedFoods);
        return new Response(
          JSON.stringify({
            mealPlan: fallbackMealPlan,
            modelUsed: modelName,
            isFallback: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Fix any remaining meal type inconsistencies in the weekly plan
      Object.keys(processedMealPlan.mealPlan.weeklyPlan).forEach(day => {
        const dayPlan = processedMealPlan.mealPlan.weeklyPlan[day];
        if (dayPlan && dayPlan.meals) {
          // Create a new meals object with correct keys
          const correctedMeals = {};
          
          // Map different meal type formats to the correct format
          const mealTypeMap = {
            'breakfast': 'breakfast',
            'morning_snack': 'morningSnack',
            'morningSnack': 'morningSnack',
            'lunch': 'lunch',
            'afternoon_snack': 'afternoonSnack',
            'afternoonSnack': 'afternoonSnack',
            'dinner': 'dinner',
            'evening_snack': 'eveningSnack',
            'eveningSnack': 'eveningSnack'
          };
          
          // Copy and correct each meal
          Object.keys(dayPlan.meals).forEach(mealType => {
            const correctMealType = mealTypeMap[mealType] || mealType;
            if (dayPlan.meals[mealType]) {
              correctedMeals[correctMealType] = dayPlan.meals[mealType];
              
              // Fix missing units in foods
              if (correctedMeals[correctMealType].foods) {
                correctedMeals[correctMealType].foods.forEach(food => {
                  if (food && food.portion !== undefined && food.unit === undefined) {
                    food.unit = "g"; // Default unit if missing
                  }
                });
              }
            }
          });
          
          // Replace the meals object with the corrected one
          dayPlan.meals = correctedMeals;
        }
      });
      
      // Complete meal plan with the latest data
      const mealPlan = {
        ...processedMealPlan.mealPlan,
        userCalories: userData.dailyCalories,
        generatedBy: "nutri-plus-agent-llama3"
      };
      
      // Ensure lunch and dinner have required components (protein, carbs, salad)
      Object.keys(mealPlan.weeklyPlan).forEach(day => {
        const dayPlan = mealPlan.weeklyPlan[day];
        if (dayPlan && dayPlan.meals) {
          // Function to add missing components to lunch and dinner
          const ensureRequiredComponents = (meal, mealType) => {
            if (!meal || !meal.foods) return;
            
            // Check for existing components
            let hasProtein = false;
            let hasCarbs = false;
            let hasSalad = false;
            
            // Check which components already exist
            meal.foods.forEach(food => {
              const name = food.name.toLowerCase();
              
              // Check for protein foods
              if (name.includes('frango') || name.includes('carne') || 
                  name.includes('peixe') || name.includes('ovo') || 
                  name.includes('tofu') || name.includes('feijão') || 
                  name.includes('lentilha') || name.includes('grão-de-bico')) {
                hasProtein = true;
              }
              
              // Check for carbohydrate foods
              if (name.includes('arroz') || name.includes('macarrão') || 
                  name.includes('batata') || name.includes('mandioca') || 
                  name.includes('pão') || name.includes('milho') || 
                  name.includes('quinoa') || name.includes('aveia')) {
                hasCarbs = true;
              }
              
              // Check for salad/vegetable foods
              if (name.includes('salada') || name.includes('alface') || 
                  name.includes('tomate') || name.includes('pepino') || 
                  name.includes('espinafre') || name.includes('rúcula') || 
                  name.includes('cenoura') || name.includes('brócolis') ||
                  name.includes('legume') || name.includes('vegetal')) {
                hasSalad = true;
              }
            });
            
            // Add missing components
            const additionalItems = [];
            
            if (!hasProtein) {
              additionalItems.push({
                name: mealType === 'lunch' ? "Peito de frango grelhado" : "Omelete",
                portion: 100,
                unit: "g",
                details: "Preparar na grelha com temperos naturais a gosto."
              });
            }
            
            if (!hasCarbs) {
              additionalItems.push({
                name: mealType === 'lunch' ? "Arroz integral" : "Batata doce",
                portion: 100,
                unit: "g",
                details: "Cozinhar até ficar macio, temperar levemente."
              });
            }
            
            if (!hasSalad) {
              additionalItems.push({
                name: mealType === 'lunch' ? "Salada verde com tomate" : "Mix de folhas verdes",
                portion: 100,
                unit: "g",
                details: "Lavar bem as folhas e vegetais, temperar com azeite, limão e ervas."
              });
            }
            
            // Add the items to the meal
            if (additionalItems.length > 0) {
              meal.foods = [...meal.foods, ...additionalItems];
              
              // Update meal calories and macros
              additionalItems.forEach(item => {
                // Approximate nutritional values for added items
                let calories = 0;
                let protein = 0;
                let carbs = 0;
                let fats = 0;
                let fiber = 0;
                
                // Set nutritional values based on food type
                if (item.name.includes("frango")) {
                  calories = 165;
                  protein = 31;
                  fats = 3.6;
                } else if (item.name.includes("Omelete")) {
                  calories = 155;
                  protein = 13;
                  fats = 11;
                  carbs = 1;
                } else if (item.name.includes("Arroz")) {
                  calories = 130;
                  carbs = 28;
                  protein = 2.7;
                  fiber = 1.8;
                } else if (item.name.includes("Batata")) {
                  calories = 86;
                  carbs = 20;
                  protein = 1.6;
                  fiber = 3;
                } else if (item.name.includes("Salada") || item.name.includes("folhas")) {
                  calories = 25;
                  carbs = 5;
                  protein = 1.5;
                  fiber = 2.5;
                  fats = 0.2;
                }
                
                // Update meal nutrition totals
                meal.calories += calories;
                meal.macros.protein += protein;
                meal.macros.carbs += carbs;
                meal.macros.fats += fats;
                meal.macros.fiber += fiber;
                
                // Update daily totals
                dayPlan.dailyTotals.calories += calories;
                dayPlan.dailyTotals.protein += protein;
                dayPlan.dailyTotals.carbs += carbs;
                dayPlan.dailyTotals.fats += fats;
                dayPlan.dailyTotals.fiber += fiber;
              });
            }
          };
          
          // Apply to lunch and dinner
          if (dayPlan.meals.lunch) {
            ensureRequiredComponents(dayPlan.meals.lunch, 'lunch');
          }
          
          if (dayPlan.meals.dinner) {
            ensureRequiredComponents(dayPlan.meals.dinner, 'dinner');
          }
        }
      });
      
      // Ensure all days have complete meal data and details for each food
      Object.keys(mealPlan.weeklyPlan).forEach(day => {
        const dayPlan = mealPlan.weeklyPlan[day];
        if (dayPlan && dayPlan.meals) {
          Object.keys(dayPlan.meals).forEach(mealType => {
            const meal = dayPlan.meals[mealType];
            if (meal && meal.foods) {
              meal.foods.forEach(food => {
                // Ensure each food has details for preparation
                if (!food.details || food.details === "") {
                  food.details = "Prepare according to personal preference. Consume fresh when possible.";
                }
                
                // Ensure each food has unit
                if (!food.unit) {
                  food.unit = "g";
                }
              });
            }
          });
        }
      });
      
      // Verify the weekly totals match the user's calorie goal
      if (!mealPlan.weeklyTotals || 
          isNaN(mealPlan.weeklyTotals.averageCalories) || 
          isNaN(mealPlan.weeklyTotals.averageProtein) ||
          isNaN(mealPlan.weeklyTotals.averageCarbs) ||
          isNaN(mealPlan.weeklyTotals.averageFats) ||
          isNaN(mealPlan.weeklyTotals.averageFiber)) {
        
        console.log("[NUTRI+] Recalculating weekly averages due to invalid values");
        
        // Calculate weekly totals
        mealPlan.weeklyTotals = calculateWeeklyTotals(mealPlan.weeklyPlan);
      }

      console.log(`[NUTRI+] Meal plan successfully generated at ${new Date().toISOString()}`);
      console.log(`[NUTRI+] Process duration: ${(new Date().getTime() - new Date(startTime).getTime()) / 1000}s`);
      
      // Return the successful response with model info and ensure it's directly accessible
      const finalResponse = {
        mealPlan,
        modelUsed: modelName
      };
      
      console.log(`[NUTRI+] Response structure:`, Object.keys(finalResponse));
      console.log(`[NUTRI+] MealPlan structure:`, Object.keys(finalResponse.mealPlan));
      
      return new Response(
        JSON.stringify(finalResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (jsonError) {
      console.error("[NUTRI+] Error parsing JSON:", jsonError);
      console.error("[NUTRI+] Invalid JSON response:", mealPlanContent.substring(0, 1000));
      
      // Create a fallback meal plan
      const fallbackMealPlan = createFallbackMealPlan(userData, selectedFoods);
      
      return new Response(
        JSON.stringify({
          mealPlan: fallbackMealPlan,
          modelUsed: modelName,
          isFallback: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
  } catch (error) {
    // Handle any unexpected errors
    console.error("[NUTRI+] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Function to calculate weekly totals from the meal plan
function calculateWeeklyTotals(weeklyPlan) {
  const days = Object.values(weeklyPlan);
  const validDays = days.filter(day => day && day.dailyTotals);
  const dayCount = validDays.length || 1; // Avoid division by zero
  
  return {
    averageCalories: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.calories || 0), 0) / dayCount),
    averageProtein: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.protein || 0), 0) / dayCount),
    averageCarbs: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.carbs || 0), 0) / dayCount),
    averageFats: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.fats || 0), 0) / dayCount),
    averageFiber: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.fiber || 0), 0) / dayCount)
  };
}

// Function to create a fallback meal plan when the API fails
function createFallbackMealPlan(userData, selectedFoods) {
  console.log("[NUTRI+] Creating fallback meal plan using selected foods");
  
  const dayOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayNames = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  
  // Filter foods by meal type and nutritional category
  const breakfastFoods = selectedFoods.filter(food => food.meal_type?.includes('breakfast') || !food.meal_type || food.meal_type.length === 0);
  const lunchFoods = selectedFoods.filter(food => food.meal_type?.includes('lunch') || !food.meal_type || food.meal_type.length === 0);
  const dinnerFoods = selectedFoods.filter(food => food.meal_type?.includes('dinner') || !food.meal_type || food.meal_type.length === 0);
  const snackFoods = selectedFoods.filter(food => 
    food.meal_type?.includes('morning_snack') || 
    food.meal_type?.includes('afternoon_snack') || 
    !food.meal_type || 
    food.meal_type.length === 0
  );
  
  // Further categorize lunch and dinner foods
  const proteinFoods = selectedFoods.filter(food => 
    food.nutritional_category?.includes('protein') || 
    food.name.toLowerCase().includes('frango') || 
    food.name.toLowerCase().includes('carne') ||
    food.name.toLowerCase().includes('peixe') ||
    food.name.toLowerCase().includes('ovo') ||
    food.name.toLowerCase().includes('tofu')
  );
  
  const carbFoods = selectedFoods.filter(food => 
    food.nutritional_category?.includes('carbs_complex') || 
    food.name.toLowerCase().includes('arroz') ||
    food.name.toLowerCase().includes('batata') ||
    food.name.toLowerCase().includes('macarrão') ||
    food.name.toLowerCase().includes('pão')
  );
  
  const saladFoods = selectedFoods.filter(food => 
    food.nutritional_category?.includes('vegetables') || 
    food.name.toLowerCase().includes('salada') ||
    food.name.toLowerCase().includes('alface') ||
    food.name.toLowerCase().includes('tomate') ||
    food.name.toLowerCase().includes('legume')
  );
  
  // Fallback items if categories are empty
  const fallbackProteinItems = [
    { name: "Peito de frango grelhado", calories: 165, protein: 31, carbs: 0, fats: 3.6, fiber: 0 },
    { name: "Ovo cozido", calories: 155, protein: 13, carbs: 1, fats: 11, fiber: 0 },
    { name: "Filé de peixe", calories: 180, protein: 30, carbs: 0, fats: 6, fiber: 0 }
  ];
  
  const fallbackCarbItems = [
    { name: "Arroz integral", calories: 130, protein: 2.7, carbs: 28, fats: 0.3, fiber: 1.8 },
    { name: "Batata doce", calories: 86, protein: 1.6, carbs: 20, fats: 0.1, fiber: 3 },
    { name: "Macarrão integral", calories: 158, protein: 5.5, carbs: 32, fats: 0.9, fiber: 4.2 }
  ];
  
  const fallbackSaladItems = [
    { name: "Salada verde com tomate", calories: 25, protein: 1.5, carbs: 5, fats: 0.2, fiber: 2.5 },
    { name: "Mix de folhas verdes", calories: 20, protein: 1.2, carbs: 4, fats: 0.2, fiber: 2 },
    { name: "Salada de legumes", calories: 35, protein: 2, carbs: 7, fats: 0.3, fiber: 3 }
  ];
  
  // Helper function to get random items from array
  const getRandomItems = (arr, count) => {
    const result = [];
    const available = [...arr];
    for (let i = 0; i < count && available.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      result.push(available.splice(randomIndex, 1)[0]);
    }
    return result;
  };
  
  // Helper function to create a meal from food items
  const createMeal = (foods, mealType) => {
    const foodItems = foods.map(food => ({
      name: food.name,
      portion: 100,
      unit: "g",
      details: `Prepare ${food.name} de acordo com sua preferência. Consuma fresco quando possível.`
    }));
    
    const calories = foods.reduce((sum, food) => sum + (food.calories || 0), 0);
    const protein = foods.reduce((sum, food) => sum + (food.protein || 0), 0);
    const carbs = foods.reduce((sum, food) => sum + (food.carbs || 0), 0);
    const fats = foods.reduce((sum, food) => sum + (food.fats || 0), 0);
    const fiber = foods.reduce((sum, food) => sum + (food.fiber || 0), 0);
    
    return {
      description: mealType === 'lunch' || mealType === 'dinner' 
        ? `Refeição balanceada com proteína, carboidrato e salada` 
        : `Refeição de ${mealType}`,
      foods: foodItems,
      calories: calories,
      macros: {
        protein: protein,
        carbs: carbs,
        fats: fats,
        fiber: fiber
      }
    };
  };
  
  // Create lunch and dinner with required components
  const createBalancedMeal = (mealType) => {
    // For protein
    let proteinItem;
    if (proteinFoods.length > 0) {
      proteinItem = getRandomItems(proteinFoods, 1)[0];
    } else {
      proteinItem = fallbackProteinItems[Math.floor(Math.random() * fallbackProteinItems.length)];
    }
    
    // For carbs
    let carbItem;
    if (carbFoods.length > 0) {
      carbItem = getRandomItems(carbFoods, 1)[0];
    } else {
      carbItem = fallbackCarbItems[Math.floor(Math.random() * fallbackCarbItems.length)];
    }
    
    // For salad
    let saladItem;
    if (saladFoods.length > 0) {
      saladItem = getRandomItems(saladFoods, 1)[0];
    } else {
      saladItem = fallbackSaladItems[Math.floor(Math.random() * fallbackSaladItems.length)];
    }
    
    const items = [proteinItem, carbItem, saladItem];
    
    return createMeal(items, mealType);
  };
  
  // Create a weekly plan
  const weeklyPlan = {};
  
  for (let i = 0; i < 7; i++) {
    const breakfastItems = getRandomItems(breakfastFoods, 2);
    const morningSnackItems = getRandomItems(snackFoods, 1);
    const afternoonSnackItems = getRandomItems(snackFoods, 1);
    
    const breakfast = createMeal(breakfastItems, "café da manhã");
    const lunch = createBalancedMeal("almoço");
    const dinner = createBalancedMeal("jantar");
    const morningSnack = createMeal(morningSnackItems, "lanche da manhã");
    const afternoonSnack = createMeal(afternoonSnackItems, "lanche da tarde");
    
    const dailyCalories = breakfast.calories + lunch.calories + dinner.calories + 
                          morningSnack.calories + afternoonSnack.calories;
    
    const dailyProtein = breakfast.macros.protein + lunch.macros.protein + dinner.macros.protein + 
                         morningSnack.macros.protein + afternoonSnack.macros.protein;
    
    const dailyCarbs = breakfast.macros.carbs + lunch.macros.carbs + dinner.macros.carbs + 
                       morningSnack.macros.carbs + afternoonSnack.macros.carbs;
    
    const dailyFats = breakfast.macros.fats + lunch.macros.fats + dinner.macros.fats + 
                      morningSnack.macros.fats + afternoonSnack.macros.fats;
    
    const dailyFiber = breakfast.macros.fiber + lunch.macros.fiber + dinner.macros.fiber + 
                       morningSnack.macros.fiber + afternoonSnack.macros.fiber;
    
    weeklyPlan[dayOfWeek[i]] = {
      dayName: dayNames[i],
      meals: {
        breakfast,
        morningSnack,
        lunch,
        afternoonSnack,
        dinner
      },
      dailyTotals: {
        calories: dailyCalories,
        protein: dailyProtein,
        carbs: dailyCarbs,
        fats: dailyFats,
        fiber: dailyFiber
      }
    };
  }
  
  // Calculate weekly totals
  const weeklyTotals = calculateWeeklyTotals(weeklyPlan);
  
  // Create recommendations
  const recommendations = {
    general: "Consuma alimentos naturais e evite processados. Mantenha-se hidratado durante o dia.",
    preworkout: "Consuma carboidratos de fácil digestão 1-2 horas antes do treino para energia.",
    postworkout: "Após o treino, combine proteínas e carboidratos para recuperação muscular.",
    timing: [
      "Tome café da manhã até 1 hora após acordar",
      "Mantenha intervalos de 3-4 horas entre as refeições",
      "Consuma proteínas em todas as refeições",
      "Hidrate-se com 30-40ml de água por kg de peso corporal",
      "Evite refeições pesadas 2 horas antes de dormir"
    ]
  };
  
  return {
    weeklyPlan,
    weeklyTotals,
    recommendations,
    userCalories: userData.dailyCalories,
    generatedBy: "fallback-generator"
  };
}
