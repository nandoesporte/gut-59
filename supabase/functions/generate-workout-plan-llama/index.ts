
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for browser compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configure Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Groq API configuration
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract request data
    const { preferences, userId, settings } = await req.json();
    console.log("Received request with preferences:", JSON.stringify(preferences));
    console.log("User ID:", userId);
    console.log("AI settings:", JSON.stringify(settings));

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Fetch available exercises from the database
    console.log("Fetching exercises for type:", JSON.stringify(preferences.exerciseTypes));
    const exerciseTypesArray = Array.isArray(preferences.exerciseTypes) 
      ? preferences.exerciseTypes 
      : [preferences.exerciseTypes];

    // Comprehensive query to get exercises with all metadata
    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("*")
      .in("exercise_type", exerciseTypesArray);
      
    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      throw new Error(`Error fetching exercises: ${exercisesError.message}`);
    }

    console.log(`Fetched ${exercises.length} exercises`);

    // Match exercises to user preferences
    const matchedExercises = matchExercisesToPreferences(exercises, preferences);
    console.log(`Matched ${matchedExercises.length} exercises to user preferences`);

    // Build system prompt incorporating AI model settings
    let systemPrompt = settings.system_prompt || "";
    
    // If not using custom prompt, append standard instructions
    if (!settings.use_custom_prompt) {
      systemPrompt += `
You are TRENE2025, an expert fitness trainer AI that creates personalized 7-day workout plans.
Your task is to analyze the user's profile and create a detailed, effective, and safe workout plan.

IMPORTANT GUIDELINES:
1. Create a 7-day workout plan with appropriate rest days based on user's activity level and goals
2. For each workout day, include appropriate warmup and cooldown instructions
3. Select exercises that match the user's fitness level, goals, available equipment, and preferred exercise types
4. Specify sets, reps, and rest time for each exercise
5. Organize exercises in a logical sequence to maximize effectiveness and safety
6. Adapt the plan to the user's specific needs, limitations, and goals
7. Use ONLY exercises from the provided list - these are exercises that already have demonstrations available
8. NEVER include exercises that haven't been provided in the list

Your response must be valid JSON with this structure:
{
  "goal": "User's primary fitness goal",
  "start_date": "YYYY-MM-DD", // Current date
  "end_date": "YYYY-MM-DD", // Current date + 7 days
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "Detailed warmup instructions",
      "cooldown_description": "Detailed cooldown instructions",
      "session_exercises": [
        {
          "exercise": {
            "id": "exercise-uuid-from-the-provided-list",
            "name": "Exercise name"
          },
          "sets": 3,
          "reps": 12,
          "rest_time_seconds": 60
        }
      ]
    }
  ]
}
`;
    }

    // Create the user prompt with detailed information about the user's preferences and available exercises
    const userPrompt = `
Please create a personalized 7-day workout plan based on this user profile:

USER PROFILE:
- Age: ${preferences.age} years
- Gender: ${preferences.gender}
- Weight: ${preferences.weight} kg
- Height: ${preferences.height} cm
- Fitness goal: ${preferences.goal}
- Activity level: ${preferences.activityLevel}
- Preferred exercise types: ${preferences.exerciseTypes.join(", ")}
- Available equipment/training location: ${preferences.trainingLocation}
${preferences.healthConditions ? `- Health conditions: ${preferences.healthConditions.join(", ")}` : "- No specific health conditions"}

AVAILABLE EXERCISES:
${matchedExercises.map(exercise => `
- ID: ${exercise.id}
- Name: ${exercise.name}
- Description: ${exercise.description || 'N/A'}
- Difficulty: ${exercise.difficulty}
- Exercise Type: ${exercise.exercise_type}
- Muscle Group: ${exercise.muscle_group}
- Equipment Needed: ${exercise.equipment_needed ? exercise.equipment_needed.join(", ") : 'None'}
- Is Compound Movement: ${exercise.is_compound_movement ? 'Yes' : 'No'}
- Recommended Sets Range: ${exercise.min_sets || 3}-${exercise.max_sets || 5}
- Recommended Reps Range: ${exercise.min_reps || 8}-${exercise.max_reps || 12}
- Recommended Rest Time: ${exercise.rest_time_seconds || 60} seconds
- Primary Muscles Worked: ${exercise.primary_muscles_worked ? exercise.primary_muscles_worked.join(", ") : 'Not specified'}
- Secondary Muscles Worked: ${exercise.secondary_muscles_worked ? exercise.secondary_muscles_worked.join(", ") : 'Not specified'}
`).join('')}

IMPORTANT:
1. Only use exercises from the provided list.
2. Each exercise ID in your response must match an ID from the list above.
3. Create a balanced plan that aligns with the user's goals and fitness level.
4. Include appropriate rest days based on activity level and training experience.
5. Consider the user's health conditions when selecting exercises.
6. Structure the response as valid JSON according to the format specified.
7. Make sure the exercise plan is progressive and challenging but safe.
8. Include clear warmup and cooldown instructions for each workout day.
`;

    console.log("Calling LLaMA model via Groq API");
    
    // Call the Groq API with LLaMA 3
    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.active_model || "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error("Groq API error:", errorData);
      throw new Error(`Groq API error: ${errorData}`);
    }

    const groqData = await groqResponse.json();
    console.log("Received response from Groq");
    
    // Extract the completion text
    const completion = groqData.choices[0].message.content;
    
    // Parse the JSON response
    let workoutPlan;
    try {
      // Find JSON in the response (in case there's surrounding text)
      const jsonMatch = completion.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : completion;
      workoutPlan = JSON.parse(jsonStr);
      console.log("Successfully parsed workout plan JSON");
    } catch (parseError) {
      console.error("Error parsing LLaMA response as JSON:", parseError);
      console.log("Raw response:", completion);
      throw new Error("Failed to parse workout plan from AI response");
    }

    // Enrich the workout plan with full exercise details
    enrichWorkoutPlanWithExerciseDetails(workoutPlan, exercises);
    console.log("Enriched workout plan with exercise details");

    // Return the enriched workout plan
    return new Response(
      JSON.stringify({ workoutPlan }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in generate-workout-plan-llama function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Match exercises to user preferences based on multiple factors
 */
function matchExercisesToPreferences(exercises, preferences) {
  // Extract user preferences
  const { 
    goal, 
    trainingLocation, 
    exerciseTypes, 
    activityLevel, 
    healthConditions = [],
    gender,
    age
  } = preferences;

  // Determine difficulty based on activity level
  let targetDifficulty;
  switch (activityLevel) {
    case 'sedentary':
      targetDifficulty = 'beginner';
      break;
    case 'light':
      targetDifficulty = 'beginner';
      break;
    case 'moderate':
      targetDifficulty = 'intermediate';
      break;
    case 'active':
      targetDifficulty = 'advanced';
      break;
    default:
      targetDifficulty = 'beginner';
  }

  // Determine equipment availability based on training location
  let availableEquipment = [];
  switch (trainingLocation) {
    case 'gym':
      availableEquipment = ['all', 'barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'bench', 'rack', 'medicine ball', 'stability ball', 'resistance band'];
      break;
    case 'home':
      availableEquipment = ['bodyweight', 'dumbbell', 'resistance band', 'kettlebell', 'stability ball'];
      break;
    case 'outdoor':
      availableEquipment = ['bodyweight', 'kettlebell', 'resistance band'];
      break;
    case 'minimal':
      availableEquipment = ['bodyweight', 'resistance band'];
      break;
    default:
      availableEquipment = ['bodyweight'];
  }

  // Score and filter exercises based on relevance to user preferences
  return exercises
    .map(exercise => {
      let score = 0;
      
      // Exercise type match
      if (exerciseTypes.includes(exercise.exercise_type)) {
        score += 30;
      }

      // Equipment match
      const hasRequiredEquipment = !exercise.equipment_needed || 
        exercise.equipment_needed.some(eq => 
          availableEquipment.includes(eq.toLowerCase())
        );
      
      if (hasRequiredEquipment) {
        score += 20;
      } else {
        // Immediately exclude exercises that require unavailable equipment
        return { ...exercise, score: -1000 };
      }

      // Difficulty match
      if (exercise.difficulty === targetDifficulty) {
        score += 20;
      } else if (
        (targetDifficulty === 'intermediate' && exercise.difficulty === 'beginner') ||
        (targetDifficulty === 'advanced' && exercise.difficulty === 'intermediate')
      ) {
        score += 10; // Adjacent difficulty levels are okay
      }

      // Goal match
      if (exercise.goals && exercise.goals.some(g => g.toLowerCase().includes(goal.toLowerCase()))) {
        score += 15;
      }
      
      // Compound movements preference based on goals
      if (goal === 'gain_muscle' && exercise.is_compound_movement) {
        score += 10;
      }
      
      // Health condition compatibility
      if (healthConditions.length > 0) {
        if (exercise.contraindicated_conditions) {
          const hasContraindication = healthConditions.some(condition => 
            exercise.contraindicated_conditions.some(contra => 
              contra.toLowerCase().includes(condition.toLowerCase())
            )
          );
          
          if (hasContraindication) {
            score -= 100; // Strongly penalize contraindicated exercises
          }
        }
        
        if (exercise.suitable_for_conditions) {
          const isSpecificallyRecommended = healthConditions.some(condition => 
            exercise.suitable_for_conditions.some(suitable => 
              suitable.toLowerCase().includes(condition.toLowerCase())
            )
          );
          
          if (isSpecificallyRecommended) {
            score += 15;
          }
        }
      }
      
      // Age considerations
      if (age > 60 && exercise.difficulty === 'expert') {
        score -= 10;
      }
      
      return { ...exercise, score };
    })
    .filter(exercise => exercise.score > 0) // Remove exercises with negative scores
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, 50); // Limit to top 50 exercises to keep the prompt size manageable
}

/**
 * Enrich workout plan with full exercise details
 */
function enrichWorkoutPlanWithExerciseDetails(workoutPlan, exercises) {
  if (!workoutPlan || !workoutPlan.workout_sessions) {
    console.warn("Invalid workout plan structure for enrichment");
    return;
  }

  // Create exercise lookup for quick access
  const exerciseLookup = {};
  exercises.forEach(exercise => {
    exerciseLookup[exercise.id] = exercise;
  });

  // Enrich each session's exercises with full details
  workoutPlan.workout_sessions.forEach(session => {
    if (!session.session_exercises || !Array.isArray(session.session_exercises)) {
      console.warn(`Invalid session structure for day ${session.day_number}`);
      return;
    }

    session.session_exercises = session.session_exercises.map(sessionExercise => {
      if (!sessionExercise.exercise || !sessionExercise.exercise.id) {
        console.warn("Invalid exercise reference in session");
        return sessionExercise;
      }

      const exerciseId = sessionExercise.exercise.id;
      const fullExercise = exerciseLookup[exerciseId];

      if (!fullExercise) {
        console.warn(`Exercise with ID ${exerciseId} not found in database`);
        return sessionExercise;
      }

      // Replace the minimal exercise reference with full details
      return {
        ...sessionExercise,
        exercise: {
          id: fullExercise.id,
          name: fullExercise.name,
          description: fullExercise.description || "",
          gif_url: fullExercise.gif_url || "",
          difficulty: fullExercise.difficulty,
          muscle_group: fullExercise.muscle_group,
          primary_muscles_worked: fullExercise.primary_muscles_worked || [],
          secondary_muscles_worked: fullExercise.secondary_muscles_worked || [],
          is_compound_movement: fullExercise.is_compound_movement || false,
          equipment_needed: fullExercise.equipment_needed || [],
          common_mistakes: fullExercise.common_mistakes || [],
          safety_considerations: fullExercise.safety_considerations || []
        }
      };
    });
  });
}
