import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Define CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client for database operations
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Main function to handle HTTP requests
serve(async (req) => {
  console.log("Workout plan generation function called");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { preferences, userId, settings } = await req.json();
    console.log("Request received:", { 
      userId, 
      preferences: {
        ...preferences,
        // Avoid logging full arrays in console
        preferred_exercise_types: Array.isArray(preferences.preferred_exercise_types) ? 
          `${preferences.preferred_exercise_types.length} items` : 'undefined',
        available_equipment: Array.isArray(preferences.available_equipment) ? 
          `${preferences.available_equipment.length} items` : 'undefined',
        health_conditions: Array.isArray(preferences.health_conditions) ? 
          `${preferences.health_conditions.length} items` : 'undefined'
      }
    });

    // Validate request
    if (!preferences) {
      throw new Error("No workout preferences provided");
    }
    if (!userId) {
      throw new Error("No user ID provided");
    }
    if (!settings || !settings.groq_api_key) {
      throw new Error("No Groq API key found in settings");
    }

    // Ensure preferences arrays are defined
    const safePreferences = {
      ...preferences,
      preferred_exercise_types: Array.isArray(preferences.preferred_exercise_types) 
        ? preferences.preferred_exercise_types 
        : [],
      available_equipment: Array.isArray(preferences.available_equipment) 
        ? preferences.available_equipment 
        : [],
      health_conditions: Array.isArray(preferences.health_conditions) 
        ? preferences.health_conditions 
        : []
    };

    console.log("Calling Groq API to generate workout plan");

    // Create the prompt for the AI
    const prompt = createWorkoutPrompt(safePreferences);
    
    // Call Groq API to generate the workout plan
    const llmResponse = await callGroqLlama(prompt, settings.groq_api_key);
    console.log("Received response from Groq");
    
    // Process and parse the LLM response
    const workoutPlan = processLlmResponse(llmResponse);
    console.log("Successfully parsed workout plan");
    
    // Resolve exercise IDs for the workout plan
    const resolvedPlan = await resolveExerciseIds(workoutPlan);
    console.log("Successfully resolved exercise IDs");

    // Return the workout plan
    return new Response(
      JSON.stringify({ workoutPlan: resolvedPlan }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error generating workout plan:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to generate workout plan" 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 400 
      }
    );
  }
});

// Call the Groq API with Llama 3 8B model
async function callGroqLlama(prompt: string, apiKey: string): Promise<string> {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  
  try {
    console.log("Making request to Groq API");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "You are an expert personal trainer specializing in creating personalized workout plans. Your plans are evidence-based, safe, and tailored to individual needs and preferences."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error("Invalid response from Groq API");
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw new Error(`Failed to generate workout plan: ${error.message}`);
  }
}

// Create a detailed prompt for the workout plan
function createWorkoutPrompt(preferences: any): string {
  return `
Create a detailed 7-day personalized workout plan based on the following preferences:

BASIC INFO:
- Age: ${preferences.age || 'Not specified'}
- Gender: ${preferences.gender || 'Not specified'}
- Weight: ${preferences.weight || 'Not specified'} kg
- Height: ${preferences.height || 'Not specified'} cm
- Experience Level: ${preferences.experience_level || 'Intermediate'}

GOAL: ${preferences.goal || 'General fitness'}

ACTIVITY LEVEL: ${preferences.activity_level || 'Moderate'}

PREFERRED EXERCISE TYPES: ${preferences.preferred_exercise_types?.join(', ') || 'Any'}

AVAILABLE EQUIPMENT: ${preferences.available_equipment?.join(', ') || 'Minimal equipment'}

HEALTH CONDITIONS: ${preferences.health_conditions?.join(', ') || 'None'}

TRAINING LOCATION: ${preferences.training_location || 'Home'}

FORMAT THE RESPONSE IN JSON OBJECT like this:
{
  "goal": "Main goal of the workout plan",
  "start_date": "Current date",
  "end_date": "End date (7 days later)",
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "Detailed warmup instructions",
      "cooldown_description": "Detailed cooldown instructions",
      "session_exercises": [
        {
          "exercise": {
            "name": "Exercise name",
            "description": "Brief description of how to perform it",
            "muscle_group": "Primary muscle targeted (chest, back, legs, shoulders, arms, core)",
            "exercise_type": "strength, cardio, flexibility, etc."
          },
          "sets": 3,
          "reps": "8-12",
          "rest_time_seconds": 60
        }
      ]
    }
  ]
}

IMPORTANT GUIDELINES:
1. Include proper warmup and cooldown sections
2. Plan should be realistic and achievable
3. Ensure proper rest days or lighter workout days
4. Consider the user's experience level and health conditions
5. Include 4-6 exercises per session
6. Structure each day to target different muscle groups
7. Provide specific sets, reps, and rest times
8. Include detailed form descriptions for each exercise

Respond ONLY with the JSON object, no introduction or explanation.
`;
}

// Process the LLM response and extract the JSON workout plan
function processLlmResponse(llmResponse: string): any {
  try {
    // Try to find JSON in the response (it might be wrapped in markdown code blocks or text)
    let jsonMatch = llmResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      // Found JSON inside markdown code blocks
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to find JSON without markdown formatting
    jsonMatch = llmResponse.match(/\{[\s\S]*?\}/);
    if (jsonMatch && jsonMatch[0]) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If still no JSON found, try to parse the whole response
    return JSON.parse(llmResponse);
  } catch (error) {
    console.error("Error parsing LLM response:", error);
    console.log("Raw LLM response:", llmResponse);
    throw new Error("Failed to parse workout plan from AI response");
  }
}

// Resolve exercise IDs by matching exercise names to the exercises table
async function resolveExerciseIds(workoutPlan: any): Promise<any> {
  // Create a deep copy to avoid modifying the original
  const resolvedPlan = JSON.parse(JSON.stringify(workoutPlan));
  
  // Process each workout session
  for (const session of resolvedPlan.workout_sessions || []) {
    if (!Array.isArray(session.session_exercises)) {
      console.warn(`Session ${session.day_number} has no exercises or invalid format`);
      session.session_exercises = [];
      continue;
    }
    
    // Process each exercise in the session
    for (const exerciseItem of session.session_exercises) {
      if (!exerciseItem.exercise || !exerciseItem.exercise.name) {
        console.warn("Invalid exercise item or missing name:", exerciseItem);
        continue;
      }
      
      try {
        // Get the exercise name for searching
        const exerciseName = exerciseItem.exercise.name;
        const muscleGroup = exerciseItem.exercise.muscle_group || '';
        
        console.log(`Resolving exercise: ${exerciseName}, muscle group: ${muscleGroup}`);
        
        // Try to find an exact match first
        let { data: exactMatches, error: exactError } = await supabaseClient
          .from('exercises')
          .select('*')
          .ilike('name', exerciseName)
          .limit(1);
          
        if (exactError) {
          console.error("Error querying exercises (exact match):", exactError);
        }
        
        // If no exact match, try fuzzy search or muscle group match
        if (!exactMatches || exactMatches.length === 0) {
          console.log(`No exact match found for ${exerciseName}, trying fuzzy search...`);
          
          // Try to find by muscle group if specified
          if (muscleGroup) {
            const { data: muscleMatches, error: muscleError } = await supabaseClient
              .from('exercises')
              .select('*')
              .ilike('muscle_group', muscleGroup)
              .limit(3);
              
            if (muscleError) {
              console.error("Error querying exercises by muscle group:", muscleError);
            }
            
            if (muscleMatches && muscleMatches.length > 0) {
              console.log(`Found ${muscleMatches.length} matches by muscle group ${muscleGroup}`);
              exactMatches = [muscleMatches[0]]; // Use the first match
            }
          }
          
          // If still no match, try partial name match
          if (!exactMatches || exactMatches.length === 0) {
            const nameParts = exerciseName.split(' ');
            if (nameParts.length > 1) {
              // Try matching with part of the name (first two words or first word if only two)
              const searchTerm = nameParts.slice(0, Math.min(2, nameParts.length)).join(' ');
              
              const { data: partialMatches, error: partialError } = await supabaseClient
                .from('exercises')
                .select('*')
                .ilike('name', `%${searchTerm}%`)
                .limit(1);
                
              if (partialError) {
                console.error("Error querying exercises (partial match):", partialError);
              }
              
              if (partialMatches && partialMatches.length > 0) {
                console.log(`Found match with partial term: ${searchTerm}`);
                exactMatches = partialMatches;
              }
            }
          }
          
          // If still no match, use a default exercise based on muscle group
          if (!exactMatches || exactMatches.length === 0) {
            console.log(`No matches found, using default exercise for ${muscleGroup || 'general'}`);
            
            const defaultMuscleGroup = muscleGroup || 'chest'; // Default to chest if no muscle group
            
            const { data: defaultExercise, error: defaultError } = await supabaseClient
              .from('exercises')
              .select('*')
              .ilike('muscle_group', defaultMuscleGroup)
              .limit(1);
              
            if (defaultError) {
              console.error("Error querying default exercise:", defaultError);
            }
            
            if (defaultExercise && defaultExercise.length > 0) {
              exactMatches = defaultExercise;
            } else {
              // If still nothing, get any exercise as last resort
              const { data: anyExercise, error: anyError } = await supabaseClient
                .from('exercises')
                .select('*')
                .limit(1);
                
              if (anyError) {
                console.error("Error querying any exercise:", anyError);
              }
              
              exactMatches = anyExercise || [];
            }
          }
        }
        
        // If we found a match, update the exercise with the database values
        if (exactMatches && exactMatches.length > 0) {
          const matchedExercise = exactMatches[0];
          console.log(`✅ Resolved exercise: ${exerciseName} → ${matchedExercise.name} (ID: ${matchedExercise.id})`);
          
          // Update with the matched exercise while preserving the original name from AI
          const originalName = exerciseItem.exercise.name;
          exerciseItem.exercise = {
            id: matchedExercise.id,
            name: originalName, // Keep the original name from the AI
            description: matchedExercise.description || exerciseItem.exercise.description || '',
            gif_url: matchedExercise.gif_url || '',
            muscle_group: matchedExercise.muscle_group || exerciseItem.exercise.muscle_group || '',
            exercise_type: matchedExercise.exercise_type || exerciseItem.exercise.exercise_type || ''
          };
        } else {
          console.warn(`❌ Could not find any exercise match for: ${exerciseName}`);
          // Keep the exercise without an ID
        }
      } catch (error) {
        console.error(`Error processing exercise ${exerciseItem.exercise?.name}:`, error);
      }
    }
  }
  
  return resolvedPlan;
}
