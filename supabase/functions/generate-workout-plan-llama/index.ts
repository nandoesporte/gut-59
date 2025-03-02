
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to safely parse JSON
function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON parsing error:", e);
    console.log("Text that failed to parse:", text);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') || '';
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Missing Supabase credentials');
    }
    
    if (!GROQ_API_KEY) {
      throw new Error('Missing Groq API key');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { preferences, userId, settings } = await req.json();
    
    console.log("Preferences received:", JSON.stringify(preferences));
    
    if (!preferences) {
      throw new Error('Preferences are required');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Ensure we have arrays for the preferences to avoid "join of undefined" errors
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
    
    // Query for all exercises in one go
    const { data: allExercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*');
    
    if (exercisesError) {
      throw new Error(`Error fetching exercises: ${exercisesError.message}`);
    }

    if (!allExercises || allExercises.length === 0) {
      throw new Error('No exercises found in the database');
    }
    
    console.log(`Found ${allExercises.length} total exercises`);

    // Filter exercises based on user preferences
    const availableEquipment = safePreferences.available_equipment;
    const isGymWorkout = availableEquipment.includes('all') || 
                         availableEquipment.includes('gym') || 
                         availableEquipment.includes('full_gym');
    
    let availableExercises = allExercises;
    
    // Filter by equipment if not in a gym
    if (!isGymWorkout && availableEquipment.length > 0) {
      availableExercises = allExercises.filter(exercise => {
        if (!exercise.equipment_needed || !Array.isArray(exercise.equipment_needed)) {
          return true; // Include exercises with no equipment
        }
        
        // Check if any of the user's available equipment matches any of the exercise's required equipment
        return exercise.equipment_needed.some(eq => 
          availableEquipment.includes(eq) || eq === 'none' || eq === 'bodyweight'
        );
      });
      
      console.log(`Filtered to ${availableExercises.length} exercises based on available equipment`);
    }
    
    // If we have preferred exercise types, filter by those
    if (safePreferences.preferred_exercise_types.length > 0) {
      const preferredTypes = safePreferences.preferred_exercise_types;
      availableExercises = availableExercises.filter(exercise => 
        preferredTypes.includes(exercise.exercise_type)
      );
      
      console.log(`Filtered to ${availableExercises.length} exercises based on preferred types`);
    }

    // Allow at least some exercises even if filtering is too restrictive
    if (availableExercises.length < 10) {
      console.log("Too few exercises after filtering, using all exercises");
      availableExercises = allExercises;
    }
    
    // Extract key data for the prompt
    const exerciseData = availableExercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      muscle_group: ex.muscle_group,
      exercise_type: ex.exercise_type,
      equipment_needed: ex.equipment_needed
    }));

    // Create the workout plan generation prompt
    const systemPrompt = settings?.system_prompt || 
      "You are a professional personal trainer AI that creates workout plans based on user preferences.";
    
    const userPrompt = `
    Create a 7-day workout plan for a person with the following details:
    - Age: ${safePreferences.age}
    - Weight: ${safePreferences.weight} kg
    - Height: ${safePreferences.height} cm
    - Gender: ${safePreferences.gender}
    - Fitness goal: ${safePreferences.goal}
    - Activity level: ${safePreferences.activity_level}
    - Preferred exercise types: ${safePreferences.preferred_exercise_types.join(', ')}
    ${safePreferences.health_conditions.length > 0 ? 
      `- Health conditions to consider: ${safePreferences.health_conditions.join(', ')}` : ''}
    
    Select exercises from this list (include the ID in your response):
    ${JSON.stringify(exerciseData)}
    
    For each day, include:
    1. Day number
    2. A brief warmup description
    3. 4-6 exercises with:
       - Sets (3-5)
       - Repetitions (8-15)
       - Rest time in seconds (30-120)
    4. A brief cooldown routine
    
    Format your response as a JSON object without any additional text:
    {
      "goal": "A brief description of the workout plan goal",
      "workout_sessions": [
        {
          "day_number": 1,
          "warmup_description": "5-minute warmup description",
          "session_exercises": [
            {
              "exercise": {
                "id": "exercise-uuid",
                "name": "Exercise Name",
                "muscle_group": "muscle group",
                "exercise_type": "exercise type"
              },
              "sets": 3,
              "reps": 10,
              "rest_time_seconds": 60
            }
          ],
          "cooldown_description": "5-minute cooldown description"
        }
      ]
    }
    `;

    console.log("Sending request to Groq API");
    
    // Make request to Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const groqResponse = await response.json();
    const llmResponse = groqResponse.choices[0].message.content.trim();
    
    console.log("Received LLM response");
    
    // Try to extract JSON from the response
    let startIdx = llmResponse.indexOf('{');
    let endIdx = llmResponse.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
      console.error("Could not find valid JSON in the response:", llmResponse);
      throw new Error("Invalid JSON response from LLM");
    }
    
    const jsonString = llmResponse.substring(startIdx, endIdx + 1);
    const parsedWorkoutPlan = safeJsonParse(jsonString);
    
    if (!parsedWorkoutPlan) {
      throw new Error("Failed to parse workout plan JSON");
    }
    
    console.log("Successfully parsed workout plan");
    
    // Validate and ensure exercise IDs are correct
    if (!parsedWorkoutPlan.workout_sessions || !Array.isArray(parsedWorkoutPlan.workout_sessions)) {
      throw new Error("Invalid workout plan: missing workout_sessions array");
    }
    
    for (const session of parsedWorkoutPlan.workout_sessions) {
      if (!session.session_exercises || !Array.isArray(session.session_exercises)) {
        continue;
      }
      
      for (let i = 0; i < session.session_exercises.length; i++) {
        const exerciseItem = session.session_exercises[i];
        
        if (!exerciseItem.exercise || !exerciseItem.exercise.id) {
          console.warn(`Exercise at day ${session.day_number}, position ${i} has no ID, attempting to find by name`);
          
          if (exerciseItem.exercise?.name) {
            // Try to find by name
            const matchedExercise = allExercises.find(e => 
              e.name.toLowerCase() === exerciseItem.exercise.name.toLowerCase()
            );
            
            if (matchedExercise) {
              console.log(`Found exercise by name: ${matchedExercise.name} (${matchedExercise.id})`);
              exerciseItem.exercise.id = matchedExercise.id;
              exerciseItem.exercise.muscle_group = matchedExercise.muscle_group;
              exerciseItem.exercise.exercise_type = matchedExercise.exercise_type;
            } else {
              // Try partial name match
              const partialMatch = allExercises.find(e => 
                e.name.toLowerCase().includes(exerciseItem.exercise.name.toLowerCase()) ||
                exerciseItem.exercise.name.toLowerCase().includes(e.name.toLowerCase())
              );
              
              if (partialMatch) {
                console.log(`Found exercise by partial name match: ${partialMatch.name} (${partialMatch.id})`);
                exerciseItem.exercise.id = partialMatch.id;
                exerciseItem.exercise.name = partialMatch.name;
                exerciseItem.exercise.muscle_group = partialMatch.muscle_group;
                exerciseItem.exercise.exercise_type = partialMatch.exercise_type;
              } else {
                // If all else fails, replace with a random valid exercise
                const randomExercise = availableExercises[Math.floor(Math.random() * availableExercises.length)];
                console.log(`Replacing unmatched exercise with: ${randomExercise.name} (${randomExercise.id})`);
                exerciseItem.exercise = {
                  id: randomExercise.id,
                  name: randomExercise.name,
                  muscle_group: randomExercise.muscle_group,
                  exercise_type: randomExercise.exercise_type
                };
              }
            }
          }
        }
      }
    }
    
    console.log("Workout plan processed and validated");
    
    return new Response(
      JSON.stringify({ workoutPlan: parsedWorkoutPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
