
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

It is ESSENTIAL that each food in the "foods" list contains detailed preparation instructions in the "details" field, explaining how the food should be prepared, cooked, or consumed.

IMPORTANT: Strictly respect the categorization of foods by meal type:
- Foods categorized as 'breakfast' should be placed ONLY in the breakfast meal
- Foods categorized as 'morning_snack' should be placed ONLY in the morning snack
- Foods categorized as 'lunch' should be placed ONLY in lunch
- Foods categorized as 'afternoon_snack' should be placed ONLY in the afternoon snack
- Foods categorized as 'dinner' should be placed ONLY in dinner

Recommendations should include:
{
  "general": "General nutrition advice",
  "preworkout": "Pre-workout nutrition advice",
  "postworkout": "Post-workout nutrition advice",
  "timing": ["Specific meal timing advice", "Another timing advice"]
}

REMEMBER: ALL NUMERICAL VALUES MUST BE INTEGERS OR DECIMALS, NOT STRINGS WITH UNITS. THIS IS A CRITICAL REQUIREMENT.

IMPORTANT: Due to technical limitations, your response CANNOT exceed 8000 tokens. If necessary, simplify food preparation descriptions, but NEVER omit essential information like calories, macronutrients, or required items.`;

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
7. Calculates calories and macros for each meal and day
8. Provides preparation details for each food
9. CRITICAL: Uses only numerical values for quantities, without adding units like "g" or "kcal"
10. For example, use "protein": 26 instead of "protein": "26g"
11. Uses the correct meal nomenclature in camelCase: "breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner" - don't use underscore versions like "morning_snack" or "afternoon_snack"`;

    // Track time for API call preparation
    console.log(`[NUTRI+] Preparing API call at ${new Date().toISOString()}`);

    // Get model settings from request or use defaults
    const modelName = modelConfig?.model || "llama3-8b-8192";
    const temperature = modelConfig?.temperature || 0.3;
    
    console.log(`[NUTRI+] Using model: ${modelName} with temperature: ${temperature}`);

    // Prepare the API call to Groq
    const groqPayload = {
      model: modelName,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: temperature, // Lower temperature for more consistent output
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
      
      // If we received a JSON generation error, we'll try to fix the failed_generation content
      if (response.status === 400 && errorData.includes('json_validate_failed')) {
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.error && errorJson.error.failed_generation) {
            console.log("[NUTRI+] Attempting to fix invalid JSON...");
            
            // Get the failed JSON generation
            let failedJson = errorJson.error.failed_generation;
            
            // Fix values with unit suffixes (like "26g" -> 26)
            failedJson = failedJson.replace(/"protein":\s*"?(\d+)g"?/g, '"protein": $1');
            failedJson = failedJson.replace(/"carbs":\s*"?(\d+)g"?/g, '"carbs": $1');
            failedJson = failedJson.replace(/"fats":\s*"?(\d+)g"?/g, '"fats": $1');
            failedJson = failedJson.replace(/"fiber":\s*"?(\d+)g"?/g, '"fiber": $1');
            failedJson = failedJson.replace(/"calories":\s*"?(\d+)kcal"?/g, '"calories": $1');
            failedJson = failedJson.replace(/"calories":\s*"?(\d+)\s*kcal"?/g, '"calories": $1');
            failedJson = failedJson.replace(/"protein":\s*"?(\d+)\s*g"?/g, '"protein": $1');
            failedJson = failedJson.replace(/"carbs":\s*"?(\d+)\s*g"?/g, '"carbs": $1');
            failedJson = failedJson.replace(/"fats":\s*"?(\d+)\s*g"?/g, '"fats": $1');
            failedJson = failedJson.replace(/"fiber":\s*"?(\d+)\s*g"?/g, '"fiber": $1');
            
            // Fix common JSON format issues with meal types
            failedJson = failedJson
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
            
            // Advanced fix for ... outros dias ... pattern which breaks the JSON
            failedJson = failedJson.replace(/(\s*"[^"]+"\s*:\s*\{\s*\/\*[^*]*\*\/\s*\})(,\s*\/\*\s*\.\.\.\s*outros\s*dias\s*\.\.\.\s*\*\/)/g, 
              (match, group1) => {
                return group1;
              }
            );
            
            // Attempt to complete truncated JSON if necessary
            if (!failedJson.endsWith('}')) {
              // Count open and close braces to determine needed closing
              const openBraces = (failedJson.match(/\{/g) || []).length;
              const closeBraces = (failedJson.match(/\}/g) || []).length;
              const missingCloseBraces = openBraces - closeBraces;
              
              if (missingCloseBraces > 0) {
                failedJson = failedJson + '}'.repeat(missingCloseBraces);
              }
            }
            
            try {
              // Try to parse the fixed JSON
              const fixedMealPlan = JSON.parse(failedJson);
              console.log("[NUTRI+] JSON successfully fixed!");
              
              // Process the meal plan to ensure all numerical values are actually numbers
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
                  if ((key === 'calories' || key === 'dailyTotals') && obj[key] && typeof obj[key] === 'object') {
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
                  
                  // Recursively process child objects and arrays
                  if (obj[key] && typeof obj[key] === 'object') {
                    processNumericalValues(obj[key]);
                  }
                });
                
                return obj;
              };
              
              // Process all numerical values in the meal plan
              const processedMealPlan = processNumericalValues(fixedMealPlan);
              
              // Final validation of meal plan structure
              if (processedMealPlan.mealPlan && processedMealPlan.mealPlan.weeklyPlan) {
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
                      }
                    });
                    
                    // Replace the meals object with the corrected one
                    dayPlan.meals = correctedMeals;
                  }
                });
                
                return new Response(
                  JSON.stringify({
                    mealPlan: processedMealPlan.mealPlan,
                    modelUsed: modelName,
                    recovered: true
                  }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            } catch (parseError) {
              console.error("[NUTRI+] Unable to fix JSON:", parseError);
              console.error("[NUTRI+] Incorrect JSON:", failedJson.substring(0, 500) + "...");
              
              // Try more aggressive JSON repair techniques
              try {
                // Replace problematic section with a placeholder structure
                if (parseError.message.includes("position")) {
                  const errorPosition = parseInt(parseError.message.match(/position (\d+)/)?.[1] || "0");
                  const contextStart = Math.max(0, errorPosition - 100);
                  const contextEnd = Math.min(failedJson.length, errorPosition + 100);
                  const errorContext = failedJson.substring(contextStart, contextEnd);
                  
                  console.log(`[NUTRI+] Error context (position ${errorPosition}):`, errorContext);
                  
                  // Find the closest enclosing array or object
                  let braceLevel = 0;
                  let arrayLevel = 0;
                  let lastArrayStart = -1;
                  
                  for (let i = 0; i < errorPosition; i++) {
                    if (failedJson[i] === '{') braceLevel++;
                    if (failedJson[i] === '}') braceLevel--;
                    if (failedJson[i] === '[') {
                      arrayLevel++;
                      lastArrayStart = i;
                    }
                    if (failedJson[i] === ']') arrayLevel--;
                  }
                  
                  // If error is in an array, try to fix it by closing the array
                  if (arrayLevel > 0 && lastArrayStart !== -1) {
                    const beforeError = failedJson.substring(0, lastArrayStart + 1);
                    const afterError = failedJson.substring(errorPosition);
                    
                    // Create a simplified version with empty array
                    const simplifiedJson = beforeError + "]" + afterError.substring(afterError.indexOf("]") + 1);
                    
                    try {
                      const fixedMealPlan = JSON.parse(simplifiedJson);
                      console.log("[NUTRI+] JSON successfully fixed after aggressive repair!");
                      
                      return new Response(
                        JSON.stringify({
                          mealPlan: fixedMealPlan.mealPlan,
                          modelUsed: modelName,
                          recovered: true,
                          repaired: true
                        }),
                        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                      );
                    } catch (finalError) {
                      console.error("[NUTRI+] All repair attempts failed:", finalError);
                    }
                  }
                }
              } catch (repairError) {
                console.error("[NUTRI+] Error during aggressive repair:", repairError);
              }
            }
          }
        } catch (errorParseError) {
          console.error("[NUTRI+] Error parsing API error:", errorParseError);
        }
      }
      
      // Return the error to the client if recovery failed
      return new Response(
        JSON.stringify({ 
          error: `API Error: ${response.status}`, 
          details: errorData,
          // Suggest alternative model next time
          suggestedModel: modelName === "llama3-8b-8192" ? "llama3-70b-8192" : "llama3-8b-8192"
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
      
      // Advanced fix for ... outros dias ... pattern which breaks the JSON
      formattedContent = formattedContent.replace(/(\s*"[^"]+"\s*:\s*\{\s*\/\*[^*]*\*\/\s*\})(,\s*\/\*\s*\.\.\.\s*outros\s*dias\s*\.\.\.\s*\*\/)/g, 
        (match, group1) => {
          return group1;
        }
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
        return new Response(
          JSON.stringify({ error: "Invalid meal plan structure" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
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
        
        const days = Object.values(mealPlan.weeklyPlan);
        const validDays = days.filter(day => day && day.dailyTotals);
        const dayCount = validDays.length || 1; // Avoid division by zero
        
        mealPlan.weeklyTotals = {
          averageCalories: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.calories || 0), 0) / dayCount),
          averageProtein: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.protein || 0), 0) / dayCount),
          averageCarbs: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.carbs || 0), 0) / dayCount),
          averageFats: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.fats || 0), 0) / dayCount),
          averageFiber: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.fiber || 0), 0) / dayCount)
        };
      }

      console.log(`[NUTRI+] Meal plan successfully generated at ${new Date().toISOString()}`);
      console.log(`[NUTRI+] Process duration: ${(new Date().getTime() - new Date(startTime).getTime()) / 1000}s`);
      
      // Return the successful response with model info
      return new Response(
        JSON.stringify({ 
          mealPlan,
          modelUsed: modelName
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (jsonError) {
      // If the response is not valid JSON, log the error and return error response
      console.error("[NUTRI+] Error parsing JSON:", jsonError);
      console.error("[NUTRI+] Invalid JSON response:", mealPlanContent.substring(0, 1000));
      
      // Try to repair JSON syntax
      try {
        // Locate the error
        if (jsonError.message.includes("position")) {
          const errorPosition = parseInt(jsonError.message.match(/position (\d+)/)?.[1] || "0");
          const contextStart = Math.max(0, errorPosition - 100);
          const contextEnd = Math.min(mealPlanContent.length, errorPosition + 100);
          const errorContext = mealPlanContent.substring(contextStart, contextEnd);
          
          console.log(`[NUTRI+] Error context (position ${errorPosition}):`, errorContext);
          
          // Attempt to repair specific formatting issues in the response
          let repaired = mealPlanContent;
          
          // Fix values with unit suffixes (like "26g" -> 26)
          repaired = repaired
            .replace(/"protein":\s*"?(\d+)g"?/g, '"protein": $1')
            .replace(/"carbs":\s*"?(\d+)g"?/g, '"carbs": $1')
            .replace(/"fats":\s*"?(\d+)g"?/g, '"fats": $1')
            .replace(/"fiber":\s*"?(\d+)g"?/g, '"fiber": $1')
            .replace(/"calories":\s*"?(\d+)kcal"?/g, '"calories": $1')
            .replace(/"calories":\s*"?(\d+)\s*kcal"?/g, '"calories": $1')
            .replace(/"protein":\s*"?(\d+)\s*g"?/g, '"protein": $1')
            .replace(/"carbs":\s*"?(\d+)\s*g"?/g, '"carbs": $1')
            .replace(/"fats":\s*"?(\d+)\s*g"?/g, '"fats": $1')
            .replace(/"fiber":\s*"?(\d+)\s*g"?/g, '"fiber": $1');
            
          try {
            const repairedJson = JSON.parse(repaired);
            console.log("[NUTRI+] JSON repaired successfully!");
            
            // Return the repaired JSON if it was successfully parsed
            if (repairedJson.mealPlan && repairedJson.mealPlan.weeklyPlan) {
              return new Response(
                JSON.stringify({ 
                  mealPlan: repairedJson.mealPlan,
                  modelUsed: modelName,
                  repaired: true
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } catch (repairError) {
            console.error("[NUTRI+] Repair attempt failed:", repairError);
          }
        }
      } catch (repairAttemptError) {
        console.error("[NUTRI+] Error in repair attempt:", repairAttemptError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse meal plan JSON",
          details: jsonError.message,
          rawContent: mealPlanContent.substring(0, 500) + "..." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
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

