
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
    const { preferences, userId, settings } = await req.json();

    // Validate required inputs
    if (!preferences) {
      throw new Error("Missing required preferences");
    }
    if (!userId) {
      throw new Error("Missing required userId");
    }
    
    console.log("Received request with preferences:", JSON.stringify(preferences));
    console.log("User ID:", userId);
    console.log("AI settings received:", settings ? "Yes" : "No");

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    if (!supabase) {
      throw new Error("Failed to initialize Supabase client");
    }

    // Fetch exercises from the database
    console.log("Fetching exercises from database...");
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*');

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      throw new Error(`Failed to fetch exercises: ${exercisesError.message}`);
    }

    if (!exercises || exercises.length === 0) {
      throw new Error("No exercises found in the database");
    }

    console.log(`Successfully fetched ${exercises.length} exercises`);

    // Match exercises to user preferences
    const matchedExercises = matchExercisesToPreferences(exercises, preferences);
    console.log(`Matched ${matchedExercises.length} exercises to user preferences`);

    // Prepare the system prompt
    let systemPrompt = "You are TRENE2025, an expert fitness trainer that creates personalized workout plans.";
    
    // If AI settings exist and custom prompt is enabled, use the custom prompt
    if (settings && settings.use_custom_prompt && settings.system_prompt) {
      systemPrompt = settings.system_prompt;
    }

    // Format user preferences for the prompt
    const userPreferencesText = formatUserPreferences(preferences);
    
    // Build the main prompt with exercise information
    const prompt = buildWorkoutPrompt(userPreferencesText, matchedExercises);
    
    console.log("Calling LLaMA model via Groq API...");
    
    // Make request to Groq API
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY is not set in environment variables");
    }
    
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });
    
    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", errorText);
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }
    
    const groqData = await groqResponse.json();
    console.log("Received response from Groq API");
    
    // Extract the workout plan from the response
    const llmResponse = groqData.choices[0].message.content;
    console.log("LLM Raw Response:", llmResponse);
    
    // Parse the JSON workout plan from the text response
    let workoutPlan;
    try {
      // Look for JSON structure in the response
      const jsonMatch = llmResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        llmResponse.match(/{[\s\S]*}/) || 
                        llmResponse.match(/\[\s*{[\s\S]*}\s*\]/);
      
      if (jsonMatch) {
        // Extract just the JSON part
        const jsonStr = jsonMatch[0].startsWith('```json') ? jsonMatch[1] : jsonMatch[0];
        workoutPlan = JSON.parse(jsonStr);
      } else {
        throw new Error("Could not find JSON structure in model response");
      }
    } catch (parseError) {
      console.error("Error parsing workout plan JSON:", parseError);
      console.log("Attempted to parse:", llmResponse);
      throw new Error(`Failed to parse workout plan: ${parseError.message}`);
    }
    
    console.log("Successfully parsed workout plan");
    
    // Enrich workout plan with full exercise details
    const enrichedPlan = enrichWorkoutPlanWithExerciseDetails(workoutPlan, exercises);
    console.log("Enriched workout plan with exercise details");
    
    // Return the enriched workout plan
    return new Response(
      JSON.stringify({ 
        workoutPlan: enrichedPlan,
        message: "Workout plan generated successfully" 
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      }
    );
    
  } catch (error) {
    console.error("Error in generate-workout-plan-llama function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unknown error occurred",
        details: error.stack || "No stack trace available" 
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 500
      }
    );
  }
});

// Function to match exercises to user preferences
function matchExercisesToPreferences(exercises, preferences) {
  try {
    console.log("Starting exercise matching algorithm");
    
    // Extract relevant preferences
    const { 
      exerciseTypes = [],
      trainingLocation = '',
      age = 30,
      gender = 'male',
      goal = 'strength',
      fitnessLevel = 'intermediate',
      healthConditions = []
    } = preferences;
    
    // Define scoring weights
    const weights = {
      exerciseType: 5,
      equipment: 4,
      difficulty: 3,
      goals: 4,
      healthConditions: 5,
      age: 2
    };
    
    // Convert training location to equipment availability
    const hasGymEquipment = trainingLocation === 'gym';
    
    const scoredExercises = exercises.map(exercise => {
      let score = 0;
      
      // Score based on exercise type
      if (exerciseTypes.includes(exercise.exercise_type)) {
        score += weights.exerciseType;
      }
      
      // Score based on equipment needed
      if (hasGymEquipment || !exercise.equipment_needed || exercise.equipment_needed === 'none' || exercise.equipment_needed === 'minimal') {
        score += weights.equipment;
      }
      
      // Score based on difficulty level
      const difficultyMap = {
        'beginner': 1,
        'intermediate': 2,
        'advanced': 3
      };
      
      const userDifficulty = difficultyMap[fitnessLevel] || 2;
      const exerciseDifficulty = difficultyMap[exercise.difficulty] || 2;
      
      // Penalize exercises that are too difficult or too easy
      const difficultyDifference = Math.abs(userDifficulty - exerciseDifficulty);
      score += weights.difficulty * (1 - (difficultyDifference / 3));
      
      // Score based on goal alignment
      if (exercise.goals && exercise.goals.includes(goal)) {
        score += weights.goals;
      }
      
      // Penalize exercises that are contraindicated for health conditions
      if (healthConditions.length > 0 && exercise.contraindicated_conditions) {
        const contraindications = Array.isArray(exercise.contraindicated_conditions) 
          ? exercise.contraindicated_conditions 
          : [exercise.contraindicated_conditions];
          
        for (const condition of healthConditions) {
          if (contraindications.some(c => c.toLowerCase().includes(condition.toLowerCase()))) {
            score -= weights.healthConditions;
          }
        }
      }
      
      // Age appropriateness
      if (age > 60 && exercise.impact === 'high') {
        score -= weights.age;
      }
      
      // Ensure complex movements aren't assigned to beginners
      if (fitnessLevel === 'beginner' && 
          (exercise.is_compound_movement || 
           exercise.coordination_requirement === 'high' || 
           exercise.balance_requirement === 'high')) {
        score -= 3;
      }
      
      return {
        ...exercise,
        matchScore: score
      };
    });
    
    // Sort exercises by score and select top matches
    const sortedExercises = scoredExercises.sort((a, b) => b.matchScore - a.matchScore);
    
    // Take top 60% of exercises to ensure variety but maintain relevance
    const topExercisesCount = Math.max(20, Math.floor(sortedExercises.length * 0.6));
    const selectedExercises = sortedExercises.slice(0, topExercisesCount);
    
    console.log(`Selected ${selectedExercises.length} exercises after scoring`);
    
    return selectedExercises;
  } catch (error) {
    console.error("Error in matchExercisesToPreferences:", error);
    // Return all exercises as fallback
    return exercises;
  }
}

// Format user preferences for the prompt
function formatUserPreferences(preferences) {
  const { 
    age, 
    gender, 
    height, 
    weight, 
    goal, 
    fitnessLevel, 
    exerciseTypes = [], 
    trainingLocation,
    trainingFrequency = 3,
    sessionDuration = 60,
    healthConditions = []
  } = preferences;
  
  return `
User Profile:
- Age: ${age || 'Not specified'}
- Gender: ${gender || 'Not specified'}
- Height: ${height || 'Not specified'} cm
- Weight: ${weight || 'Not specified'} kg
- Fitness Goal: ${goal || 'General fitness'}
- Fitness Level: ${fitnessLevel || 'Intermediate'}
- Preferred Exercise Types: ${exerciseTypes.join(', ') || 'Any'}
- Training Location: ${trainingLocation || 'Home'}
- Training Frequency: ${trainingFrequency} days per week
- Session Duration: ${sessionDuration} minutes
- Health Conditions: ${healthConditions.length > 0 ? healthConditions.join(', ') : 'None'}
`;
}

// Build the workout plan prompt
function buildWorkoutPrompt(userPreferencesText, exercises) {
  // Prepare a concise list of exercises with critical details
  const exercisesList = exercises.slice(0, 50).map(ex => {
    return `- ${ex.name} (ID: ${ex.id}): ${ex.exercise_type}, ${ex.difficulty} level, Primary muscles: ${ex.primary_muscles_worked || 'Various'}, Equipment: ${ex.equipment_needed || 'None'}`;
  }).join('\n');
  
  return `
Please create a 7-day personalized workout plan based on the following user profile:

${userPreferencesText}

Use ONLY exercises from this list (referenced by their IDs):
${exercisesList}

Create a structured 7-day workout plan with the following requirements:
1. Each day should focus on different muscle groups to allow for recovery
2. Structure each day with:
   - A 5-10 minute warm-up description
   - 4-8 exercises (with specified sets, reps and rest periods)
   - A 5-minute cooldown description
3. Each exercise entry must include the exercise ID, number of sets, number of reps, and rest time in seconds
4. Rest days should be appropriately placed based on the user's training frequency
5. The workout plan should align with the user's fitness goal and level

Return ONLY a valid JSON object with this exact structure:
{
  "goal": "User's fitness goal",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "5-10 minute warmup description",
      "cooldown_description": "5 minute cooldown description",
      "session_exercises": [
        {
          "exercise": {
            "id": "exercise-id-from-list"
          },
          "sets": 3,
          "reps": 12,
          "rest_time_seconds": 60
        }
      ]
    }
  ]
}

IMPORTANT: Only include exercises from the provided list, referenced by their exact IDs. Always return the output as valid JSON.
`;
}

// Function to enrich workout plan with full exercise details
function enrichWorkoutPlanWithExerciseDetails(workoutPlan, allExercises) {
  try {
    // Create an exercises lookup map for efficiency
    const exercisesMap = allExercises.reduce((map, exercise) => {
      map[exercise.id] = exercise;
      return map;
    }, {});
    
    // Clone the plan to avoid mutating the original
    const enrichedPlan = JSON.parse(JSON.stringify(workoutPlan));
    
    // Enrich each workout session's exercises with full details
    if (enrichedPlan.workout_sessions && Array.isArray(enrichedPlan.workout_sessions)) {
      enrichedPlan.workout_sessions.forEach(session => {
        if (session.session_exercises && Array.isArray(session.session_exercises)) {
          session.session_exercises = session.session_exercises.map(exerciseItem => {
            // Check if exercise and exercise.id exist before accessing
            if (!exerciseItem.exercise || !exerciseItem.exercise.id) {
              console.warn("Invalid exercise item or missing ID:", exerciseItem);
              return null; // Will be filtered out later
            }
            
            const exerciseId = exerciseItem.exercise.id;
            const fullExercise = exercisesMap[exerciseId];
            
            if (!fullExercise) {
              console.warn(`Exercise with ID ${exerciseId} not found in database`);
              return null; // Will be filtered out later
            }
            
            // Enrich with full exercise details
            return {
              ...exerciseItem,
              exercise: {
                id: fullExercise.id,
                name: fullExercise.name,
                description: fullExercise.description || '',
                gif_url: fullExercise.gif_url || '',
                equipment_needed: fullExercise.equipment_needed || 'None',
                primary_muscles_worked: fullExercise.primary_muscles_worked || '',
                difficulty: fullExercise.difficulty || 'intermediate'
              }
            };
          }).filter(Boolean); // Remove null exercises
        }
      });
    }
    
    return enrichedPlan;
  } catch (error) {
    console.error("Error enriching workout plan:", error);
    return workoutPlan; // Return original as fallback
  }
}
