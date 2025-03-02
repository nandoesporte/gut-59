
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const llamaApiKey = Deno.env.get('LLAMA_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Function called: generate-workout-plan-llama');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { preferences, userId, settings } = await req.json();
    
    console.log(`Processing request for user: ${userId}`);
    console.log(`Preferences received: ${JSON.stringify(preferences, null, 2)}`);
    
    if (!preferences) {
      throw new Error("No preferences provided");
    }

    if (!userId) {
      throw new Error("No user ID provided");
    }

    if (!settings) {
      throw new Error("No AI model settings provided");
    }

    // Make sure arrays are defined
    const preferredExerciseTypes = preferences.preferred_exercise_types || [];
    const availableEquipment = preferences.available_equipment || [];
    const healthConditions = preferences.health_conditions || [];

    console.log(`Building workout plan prompt...`);
    
    // Fetch available exercises based on preferences
    const { data: exercises, error: exerciseError } = await supabase
      .from('exercises')
      .select('*');
      
    if (exerciseError) {
      console.error('Error fetching exercises:', exerciseError);
      throw new Error(`Error fetching exercises: ${exerciseError.message}`);
    }
    
    console.log(`Fetched ${exercises?.length || 0} exercises`);

    if (!exercises || exercises.length === 0) {
      throw new Error("No exercises found in the database");
    }

    // Filter exercises based on available equipment and preferences if specified
    let filteredExercises = exercises;
    
    if (availableEquipment && availableEquipment.length > 0) {
      console.log(`Filtering by equipment: ${availableEquipment.join(', ')}`);
      filteredExercises = exercises.filter(ex => 
        !ex.equipment || 
        ex.equipment === 'none' || 
        availableEquipment.some(eq => ex.equipment && ex.equipment.includes(eq))
      );
    }
    
    if (preferredExerciseTypes && preferredExerciseTypes.length > 0) {
      console.log(`Filtering by exercise types: ${preferredExerciseTypes.join(', ')}`);
      filteredExercises = filteredExercises.filter(ex => 
        preferredExerciseTypes.some(type => ex.exercise_type && ex.exercise_type.includes(type))
      );
    }
    
    // If filters were too restrictive, fall back to original set
    if (filteredExercises.length < 10) {
      console.log(`Too few exercises after filtering (${filteredExercises.length}), using complete exercise set`);
      filteredExercises = exercises;
    }
    
    console.log(`Using ${filteredExercises.length} exercises after filtering`);

    // Build the system prompt
    const systemPrompt = `You are an advanced personal trainer AI that creates personalized workout plans. 
You will receive user information and preferences, and your task is to create a detailed 7-day workout plan.
The workout plan should be specifically tailored to the user's needs, goals, fitness level, and any health conditions.
Your workout plan should be REALISTIC, EFFECTIVE, and EVIDENCE-BASED.
The exercises you recommend MUST ONLY be from the list of exercises provided and include their exact IDs.

Some guidelines:
1. The workout plan should align with the user's goal: ${preferences.goal}
2. Account for the user's fitness level: ${preferences.fitness_level}
3. Consider any health conditions: ${healthConditions.join(', ') || 'None'}
4. Consider their age (${preferences.age}) and gender (${preferences.gender})
5. Structure each day with appropriate warm-up, main exercises, and cool-down
6. Include sets, reps, and rest times for each exercise
7. Balance the workout plan across the week for different muscle groups
8. Include rest days as appropriate based on fitness level

The response MUST be valid JSON that follows this exact structure:
{
  "goal": "Brief description of workout plan goal",
  "start_date": "YYYY-MM-DD", // Current date
  "end_date": "YYYY-MM-DD", // Current date + 7 days
  "workout_sessions": [
    {
      "day_number": 1, // Number from 1-7 representing day of the week
      "warmup_description": "Short description of warm-up routine",
      "cooldown_description": "Short description of cool-down routine",
      "session_exercises": [
        {
          "exercise": {
            "id": "uuid-of-exercise", // Must match EXACTLY one of the exercises provided
            "name": "Name matching the exercise ID",
            "muscle_group": "Primary muscle group",
            "exercise_type": "Type of exercise"
          },
          "sets": 3, // Number of sets
          "reps": 10, // Number of reps per set
          "rest_time_seconds": 60 // Rest time between sets in seconds
        }
        // More exercises...
      ]
    }
    // More days...
  ]
}`;

    const userPrompt = `Please create a personalized 7-day workout plan based on the following information:

User Information:
- Age: ${preferences.age}
- Gender: ${preferences.gender}
- Height: ${preferences.height} cm
- Weight: ${preferences.weight} kg
- Fitness Level: ${preferences.fitness_level}
- Workout Goal: ${preferences.goal}
- Preferred Exercise Types: ${preferredExerciseTypes.join(', ') || 'Any'}
- Available Equipment: ${availableEquipment.join(', ') || 'Any'}
- Health Conditions or Limitations: ${healthConditions.join(', ') || 'None'}
- Workout Location: ${preferences.workout_location || 'Any'}
- Days Per Week Available: ${preferences.days_per_week || 7}
- Time Per Session: ${preferences.time_per_session || '60'} minutes

Available Exercises (you MUST ONLY use these with their exact IDs):
${filteredExercises.slice(0, 100).map(ex => `- ID: ${ex.id}, Name: ${ex.name}, Type: ${ex.exercise_type || 'General'}, Equipment: ${ex.equipment || 'None'}, Muscle Group: ${ex.muscle_group || 'Full body'}`).join('\n')}

Remember to create a plan that matches their fitness level and addresses their specific needs and goals. The response must be valid JSON following the structure provided earlier.`;

    console.log(`Calling Llama API with prompts ready`);
    
    const response = await fetch('https://api.llama.cloud/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llamaApiKey}`,
      },
      body: JSON.stringify({
        model: settings.model_name || "llama-3-70b-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: settings.temperature || 0.7,
        max_tokens: 4000
      }),
    });

    const responseData = await response.json();
    console.log(`Received response from Llama API: ${JSON.stringify(responseData, null, 2).substring(0, 200)}...`);

    if (!response.ok) {
      throw new Error(`Error from Llama API: ${responseData.error?.message || JSON.stringify(responseData)}`);
    }

    if (!responseData.choices || responseData.choices.length === 0) {
      throw new Error("No choices returned from Llama API");
    }

    const aiContent = responseData.choices[0].message.content;
    console.log(`Raw AI content received (first 200 chars): ${aiContent.substring(0, 200)}...`);
    
    // Extract JSON from the response
    let workoutPlanData;
    try {
      // First look for JSON block wrapped in ```json and ``` markdown
      const jsonMatch = aiContent.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        console.log("Found JSON inside markdown code block");
        workoutPlanData = JSON.parse(jsonMatch[1]);
      } else {
        // If not found, try to parse the entire response as JSON
        workoutPlanData = JSON.parse(aiContent);
      }
      
      console.log(`Successfully parsed workout plan data`);
    } catch (parseError) {
      console.error("Error parsing workout plan JSON:", parseError);
      console.log("Failed content:", aiContent);
      throw new Error(`Failed to parse workout plan from AI response: ${parseError.message}`);
    }

    // Validate workout plan data structure
    if (!workoutPlanData || !workoutPlanData.workout_sessions || !Array.isArray(workoutPlanData.workout_sessions)) {
      console.error("Invalid workout plan structure:", workoutPlanData);
      throw new Error("Invalid workout plan structure returned by AI");
    }

    // Validate exercise IDs and fix if necessary
    let needsFallbackExercises = false;
    const exerciseIdMap = {};
    exercises.forEach(ex => {
      exerciseIdMap[ex.id] = ex;
    });

    // Process each workout session to ensure valid exercise IDs
    for (const session of workoutPlanData.workout_sessions) {
      if (!session.session_exercises || !Array.isArray(session.session_exercises)) {
        console.error(`Session missing exercises array:`, session);
        session.session_exercises = [];
        continue;
      }

      for (let i = 0; i < session.session_exercises.length; i++) {
        const exerciseItem = session.session_exercises[i];
        if (!exerciseItem.exercise || !exerciseItem.exercise.id) {
          console.error(`Exercise item missing ID at index ${i} in session ${session.day_number}:`, exerciseItem);
          needsFallbackExercises = true;
          continue;
        }

        // Check if exercise ID exists in our database
        if (!exerciseIdMap[exerciseItem.exercise.id]) {
          console.warn(`Exercise ID not found in database: ${exerciseItem.exercise.id}, name: ${exerciseItem.exercise.name}`);
          
          // Try to find by name match
          const matchByName = exercises.find(ex => ex.name && exerciseItem.exercise.name && 
                                           ex.name.toLowerCase() === exerciseItem.exercise.name.toLowerCase());
          if (matchByName) {
            console.log(`Found match by exact name: ${matchByName.id}`);
            exerciseItem.exercise.id = matchByName.id;
            continue;
          }
          
          // Try to find by partial name match
          const partialMatches = exercises.filter(ex => ex.name && exerciseItem.exercise.name && 
                                              ex.name.toLowerCase().includes(exerciseItem.exercise.name.toLowerCase()));
          if (partialMatches.length > 0) {
            console.log(`Found ${partialMatches.length} partial name matches, using first: ${partialMatches[0].id}`);
            exerciseItem.exercise.id = partialMatches[0].id;
            continue;
          }
          
          // If no match found, use a fallback exercise from the same muscle group if possible
          const muscleGroup = exerciseItem.exercise.muscle_group || 'general';
          const muscleGroupMatches = exercises.filter(ex => 
            ex.muscle_group && ex.muscle_group.toLowerCase() === muscleGroup.toLowerCase()
          );
          
          if (muscleGroupMatches.length > 0) {
            const replacement = muscleGroupMatches[Math.floor(Math.random() * muscleGroupMatches.length)];
            console.log(`Using replacement exercise from same muscle group: ${replacement.id}`);
            exerciseItem.exercise.id = replacement.id;
            exerciseItem.exercise.name = replacement.name;
          } else {
            // Last resort, use any random exercise
            const randomExercise = exercises[Math.floor(Math.random() * exercises.length)];
            console.log(`Using random exercise as last resort: ${randomExercise.id}`);
            exerciseItem.exercise.id = randomExercise.id;
            exerciseItem.exercise.name = randomExercise.name;
          }
        }
      }
    }

    if (needsFallbackExercises) {
      console.log("Some exercises needed fallbacks or fixes");
    }

    console.log(`Final workout plan ready to return`);
    
    return new Response(
      JSON.stringify({ workoutPlan: workoutPlanData }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error("Error in generate-workout-plan-llama function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An error occurred while generating workout plan",
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
