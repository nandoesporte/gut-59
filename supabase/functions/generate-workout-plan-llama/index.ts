
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY } = Deno.env.toObject();
    
    // Create a Supabase client with the service role key for admin privileges
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Parse request body
    const { preferences, userId, settings } = await req.json();
    if (!preferences || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("Received workout plan generation request for user:", userId);
    console.log("Preferences:", JSON.stringify(preferences));

    // Fetch all exercises from the database to select from later
    const { data: exercisesData, error: exercisesError } = await supabase
      .from('exercises')
      .select('*');

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch exercises" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!exercisesData || exercisesData.length === 0) {
      return new Response(
        JSON.stringify({ error: "No exercises found in database" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Found ${exercisesData.length} exercises in database`);

    // Prepare the prompt for the LLM
    const exerciseTypes = preferences.exerciseTypes.join(", ");
    const prompt = `
    Create a 7-day personalized workout plan for a ${preferences.gender}, age ${preferences.age}, with a primary goal of ${preferences.goal}. 
    Their fitness level is ${preferences.fitnessLevel} and they prefer to train at ${preferences.trainingLocation}.
    They enjoy ${exerciseTypes} exercises and are available to train ${preferences.daysPerWeek} days per week. 
    Their height is ${preferences.height}cm and weight is ${preferences.weight}kg.
    
    Include 1 day focused on ${preferences.favoriteBodyPart || "full body"} exercises.
    
    For each day, include a warmup routine and cooldown routine.
    Include 4-6 exercises per day, with specified sets, reps, and rest times.
    Choose exercises from this list (use the exact exercise names provided):
    ${exercisesData.map(ex => `- ${ex.name} (ID: ${ex.id}, Type: ${ex.exercise_type}, Muscle Group: ${ex.muscle_group})`).join('\n')}
    
    Return your response as a JSON object with this exact structure:
    {
      "workoutPlan": {
        "goal": "user's goal",
        "workout_sessions": [
          {
            "day_number": 1,
            "warmup_description": "detailed warmup routine",
            "cooldown_description": "detailed cooldown routine",
            "session_exercises": [
              {
                "exercise": {
                  "id": "exact exercise id from the list",
                  "name": "exact exercise name from the list",
                  "muscle_group": "muscle group"
                },
                "sets": number,
                "reps": number,
                "rest_time_seconds": number
              }
            ]
          }
        ]
      }
    }
    
    Ensure you only use exercises from the provided list, and always include the exercise ID exactly as provided.
    If you need to create a rest day, include it with an empty session_exercises array.
    `;

    console.log("Sending request to Groq API");

    // Call the Groq API with Llama 3 model
    const llmResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: settings?.model_name || "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "You are a professional fitness trainer AI that creates personalized workout plans. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: settings?.temperature || 0.7,
        max_tokens: settings?.max_tokens || 4000
      })
    });

    // Parse the response from Groq
    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("Groq API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate workout plan from Groq API" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const llmData = await llmResponse.json();
    const content = llmData.choices[0].message.content;
    
    console.log("Received response from Groq API");

    // Extract the JSON from the response
    let workoutPlan;
    try {
      // First try to parse the entire content as JSON
      workoutPlan = JSON.parse(content);
    } catch (e) {
      // If that fails, try to extract JSON from the text
      console.log("Failed to parse entire response as JSON, attempting to extract JSON portion");
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          workoutPlan = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not extract JSON from response");
        }
      } catch (extractError) {
        console.error("Error extracting JSON from LLM response:", extractError);
        return new Response(
          JSON.stringify({ error: "Failed to parse workout plan from LLM response" }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    // Validate and clean up the workout plan
    if (!workoutPlan || !workoutPlan.workoutPlan) {
      console.error("Invalid workout plan structure received");
      return new Response(
        JSON.stringify({ error: "Invalid workout plan structure received from LLM" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create a map of exercise IDs for quick lookup
    const exerciseMap = new Map();
    exercisesData.forEach(ex => {
      exerciseMap.set(ex.id, ex);
    });

    // Validate and fix each exercise in the workout plan
    const plan = workoutPlan.workoutPlan;
    
    if (Array.isArray(plan.workout_sessions)) {
      for (const session of plan.workout_sessions) {
        if (Array.isArray(session.session_exercises)) {
          for (const ex of session.session_exercises) {
            if (ex.exercise) {
              // If the exercise ID doesn't exist in our database, find a replacement
              if (!exerciseMap.has(ex.exercise.id)) {
                console.error(`Exercise with ID ${ex.exercise.id} not found in database`);
                
                // Try to find a matching exercise by name
                const exactMatch = exercisesData.find(dbEx => 
                  dbEx.name.toLowerCase() === ex.exercise.name.toLowerCase()
                );
                
                if (exactMatch) {
                  console.log(`Found exact name match for "${ex.exercise.name}" with ID: ${exactMatch.id}`);
                  ex.exercise.id = exactMatch.id;
                  ex.exercise.muscle_group = exactMatch.muscle_group;
                } else {
                  // Try to find a similar exercise by partial name match
                  const partialMatches = exercisesData.filter(dbEx => 
                    dbEx.name.toLowerCase().includes(ex.exercise.name.toLowerCase()) ||
                    ex.exercise.name.toLowerCase().includes(dbEx.name.toLowerCase())
                  );
                  
                  if (partialMatches.length > 0) {
                    const replacement = partialMatches[0];
                    console.log(`Replacing exercise "${ex.exercise.name}" with similar: "${replacement.name}" (ID: ${replacement.id})`);
                    ex.exercise.id = replacement.id;
                    ex.exercise.name = replacement.name;
                    ex.exercise.muscle_group = replacement.muscle_group;
                  } else {
                    // If no match found, replace with a random exercise from the database
                    const randomIndex = Math.floor(Math.random() * exercisesData.length);
                    const replacement = exercisesData[randomIndex];
                    console.log(`No match found. Replacing exercise "${ex.exercise.name}" with random: "${replacement.name}" (ID: ${replacement.id})`);
                    ex.exercise.id = replacement.id;
                    ex.exercise.name = replacement.name;
                    ex.exercise.muscle_group = replacement.muscle_group;
                  }
                }
              } else {
                // Make sure we're using the correct exercise data
                const dbExercise = exerciseMap.get(ex.exercise.id);
                ex.exercise.name = dbExercise.name;
                ex.exercise.muscle_group = dbExercise.muscle_group;
              }
              
              // Add more exercise details if needed
              const dbExercise = exerciseMap.get(ex.exercise.id);
              if (dbExercise) {
                ex.exercise.gif_url = dbExercise.gif_url;
                ex.exercise.description = dbExercise.description;
                ex.exercise.exercise_type = dbExercise.exercise_type;
              }
            }
          }
        }
      }
    }

    console.log("Workout plan validation and cleanup complete");

    // Return the processed workout plan
    return new Response(
      JSON.stringify({ 
        workoutPlan: plan,
        message: "Workout plan generated successfully" 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error.message);
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${error.message}` }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

