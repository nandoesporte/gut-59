
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
};

// Main function to handle requests
serve(async (req) => {
  console.log("Received request to generate meal plan with Groq API model");
  
  // Handle CORS preflight request
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request data
    const requestData = await req.json();
    console.log("Processing request with user data:", JSON.stringify({
      weight: requestData.userData?.weight,
      height: requestData.userData?.height,
      age: requestData.userData?.age,
      goal: requestData.userData?.goal
    }));

    // Extract the data needed for the meal plan
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = requestData;
    
    // Validate that we have the minimum required data
    if (!userData || !userData.dailyCalories || !selectedFoods || selectedFoods.length === 0) {
      console.error("Invalid input data:", JSON.stringify(requestData));
      return new Response(
        JSON.stringify({ error: 'Invalid input data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Using model configuration: ${requestData.modelConfig?.model || 'Default Groq model'}`);
    
    // Get the Groq API key from environment variables
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }

    // Construct the prompt for the model
    const prompt = constructPrompt(userData, selectedFoods, foodsByMealType, dietaryPreferences);
    
    console.log("Sending request to Groq API");
    
    // Define model - using LLaMA 3 70B Instruct model which is available in Groq
    const modelName = "llama3-70b-8192";
    
    // Prepare the message for the chat API
    const messages = [
      {
        role: "system",
        content: "You are a nutritionist AI assistant that creates personalized meal plans based on user data and food preferences."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    console.log(`Using Groq model: ${modelName}`);

    // Call Groq API to get response from the model
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Groq API error: ${errorData}`);
      throw new Error(`Failed to get response from Groq API: ${errorData}`);
    }

    const groqResponse = await response.json();
    console.log("Received response from Groq API");

    // Extract and parse the content
    const content = groqResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in Groq API response');
    }

    console.log("Attempting to parse response as JSON");
    
    // Extract JSON from the content
    let mealPlan;
    try {
      // First try to parse it directly if it's already JSON
      mealPlan = JSON.parse(content);
      console.log("Successfully parsed response as direct JSON");
    } catch (parseError) {
      console.error("Failed to parse response as pure JSON, attempting to extract JSON from text:", parseError);
      
      // Try to extract the JSON part if it's wrapped in text or markdown
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```([\s\S]*?)```/) ||
                        content.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        try {
          const jsonContent = jsonMatch[1] || jsonMatch[0];
          console.log("Extracted JSON-like content:", jsonContent.substring(0, 200) + "...");
          mealPlan = JSON.parse(jsonContent);
          console.log("Successfully extracted and parsed JSON from content");
        } catch (extractError) {
          console.error("Failed to extract JSON from content:", extractError);
          throw new Error('Failed to parse meal plan JSON from response');
        }
      } else {
        console.error("No JSON found in content");
        throw new Error('No valid JSON in response content');
      }
    }

    // Validate the meal plan structure
    if (!mealPlan || !mealPlan.weeklyPlan) {
      console.error("Invalid meal plan structure:", JSON.stringify(mealPlan).substring(0, 500) + "...");
      throw new Error('Invalid meal plan structure');
    }

    // Add the user's daily calories to the response
    mealPlan.userCalories = userData.dailyCalories;
    
    console.log("Successfully generated meal plan with Groq model");
    
    return new Response(
      JSON.stringify({ mealPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating meal plan:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        fallback: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Function to construct the prompt for the model
function constructPrompt(userData, selectedFoods, foodsByMealType, dietaryPreferences) {
  return `
Create a detailed 7-day meal plan with the following specifications:

USER PROFILE:
- Weight: ${userData.weight} kg
- Height: ${userData.height} cm
- Age: ${userData.age} years
- Gender: ${userData.gender}
- Activity Level: ${userData.activityLevel}
- Goal: ${userData.goal} (${userData.goal === 'lose' ? 'weight loss' : userData.goal === 'gain' ? 'weight gain' : 'maintenance'})
- Daily Calorie Target: ${userData.dailyCalories} calories

FOOD PREFERENCES:
${JSON.stringify(selectedFoods.map(food => food.name)).slice(0, 500)}...

${dietaryPreferences.hasAllergies ? `ALLERGIES: ${dietaryPreferences.allergies.join(', ')}` : 'NO FOOD ALLERGIES'}
${dietaryPreferences.dietaryRestrictions?.length > 0 ? `DIETARY RESTRICTIONS: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : 'NO DIETARY RESTRICTIONS'}
${dietaryPreferences.trainingTime ? `TRAINING TIME: ${dietaryPreferences.trainingTime}` : 'NO SPECIFIC TRAINING TIME'}

RESPONSE INSTRUCTIONS:
1. Create a complete 7-day meal plan with 5 meals per day (breakfast, morning snack, lunch, afternoon snack, dinner).
2. Each meal should include:
   - Food items with portions and units
   - Calorie count
   - Macronutrient breakdown (protein, carbs, fats, fiber)
   - A brief description
3. Include daily totals and weekly averages for calories and macros
4. Provide recommendations for:
   - General nutrition
   - Pre-workout nutrition
   - Post-workout nutrition
   - Meal timing
5. Output as a single, valid JSON object with this structure:
{
  "weeklyPlan": {
    "monday": {
      "dayName": "Monday",
      "meals": {
        "breakfast": {
          "description": "...",
          "foods": [
            {"name": "...", "portion": number, "unit": "...", "details": "..."}
          ],
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
    "general": "...",
    "preworkout": "...",
    "postworkout": "...",
    "timing": ["...", "...", "..."]
  }
}
`;
}
