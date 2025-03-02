
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

type WorkoutPreferences = {
  age: number;
  gender: string;
  weight: number;
  height: number;
  goal: string;
  activity_level: string;
  preferred_exercise_types: string[];
  available_equipment: string[];
  health_conditions: string[];
};

type ExerciseMeta = {
  id: string;
  name: string;
  description: string;
  gif_url: string;
  muscle_group: string;
  exercise_type: string;
};

serve(async (req) => {
  try {
    // Log request start
    console.log("Processing workout plan generation request");
    
    // Create a Supabase client with the Auth context of the logged-in user
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      throw new Error('No authorization header provided');
    }

    // Get the JWT token from the authorization header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } }
    );

    // Parse request body
    const { preferences, userId, settings } = await req.json();
    console.log("Received request for user:", userId);
    
    if (!preferences) {
      throw new Error('Missing workout preferences');
    }
    
    if (!settings) {
      throw new Error('Missing AI model settings');
    }
    
    // Check if we have a GROQ API key when needed
    if ((settings.active_model === 'llama3' || settings.active_model === 'groq') && !settings.groq_api_key) {
      throw new Error('No Groq API key found in settings');
    }
    
    // Format the preferences for better display in logs
    const safePrefs = { ...preferences };
    console.log("Using AI model:", settings.active_model);
    
    // Get all exercises for reference
    console.log("Fetching exercises from database");
    const { data: exercises, error: exercisesError } = await supabaseClient
      .from('exercises')
      .select('id, name, description, gif_url, muscle_group, exercise_type');
    
    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError.message);
      throw new Error(`Failed to fetch exercises: ${exercisesError.message}`);
    }
    
    console.log(`Found ${exercises?.length || 0} exercises`);
    
    if (!exercises || exercises.length === 0) {
      throw new Error('No exercises found in the database');
    }
    
    // Create a system prompt for the AI
    const systemPrompt = settings.use_custom_prompt 
      ? settings.system_prompt 
      : `You are a professional fitness trainer AI assistant specialized in creating personalized workout plans.
Your task is to create a comprehensive 7-day workout plan based on user preferences.
Respond ONLY with valid JSON that matches this exact schema:
{
  "goal": "string - the main fitness goal of this plan",
  "start_date": "YYYY-MM-DD - today's date",
  "end_date": "YYYY-MM-DD - 7 days from start",
  "workout_sessions": [
    {
      "day_number": 1-7,
      "warmup_description": "string - warmup routine description",
      "cooldown_description": "string - cooldown routine description",
      "session_exercises": [
        {
          "exercise": {
            "id": "string - valid exercise ID from the database",
            "name": "string - exercise name"
          },
          "sets": number,
          "reps": number or "to failure",
          "rest_time_seconds": number
        }
      ]
    }
  ]
}`;

    // Build the exercise information to be included in the user prompt
    const exerciseInfoText = exercises.map(ex => 
      `ID: ${ex.id} | Name: ${ex.name} | Type: ${ex.exercise_type} | Muscle Group: ${ex.muscle_group}`
    ).join('\n');
    
    // Create a user prompt with all the preferences information
    const userPrompt = `Create a personalized 7-day workout plan for a ${preferences.age}-year-old ${preferences.gender} with:
- Weight: ${preferences.weight} kg
- Height: ${preferences.height} cm
- Fitness goal: ${preferences.goal}
- Activity level: ${preferences.activity_level}
- Preferred exercise types: ${preferences.preferred_exercise_types?.join(', ') || 'Any'}
- Available equipment: ${preferences.available_equipment?.join(', ') || 'None'}
- Health conditions: ${preferences.health_conditions?.join(', ') || 'None'}

Choose from these valid exercises (select by ID):
${exerciseInfoText}

For EACH day of the 7-day plan, include:
1. A specific warmup section tailored to the day's exercises
2. 4-6 exercises with appropriate sets, reps, and rest times
3. A proper cooldown section

Consider appropriate recovery between muscle groups.
Provide detailed descriptions, keeping in mind safety and form.
Keep JSON response consistent with the schema provided in the system prompt.`;

    console.log("Calling AI model to generate workout plan");
    let aiResponse;
    
    // Handle different AI models
    if (settings.active_model === 'llama3' || settings.active_model === 'groq') {
      // Use GROQ API for Llama 3
      console.log("Using Groq API with Llama 3 model");
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.groq_api_key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      
      if (!groqResponse.ok) {
        const errorData = await groqResponse.text();
        console.error("Groq API error:", errorData);
        throw new Error(`Groq API error: ${groqResponse.status} ${errorData}`);
      }
      
      const groqData = await groqResponse.json();
      aiResponse = groqData.choices[0].message.content;
    } else if (settings.active_model === 'gpt4') {
      // Use OpenAI API for GPT-4
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiKey) {
        throw new Error('OpenAI API key not configured');
      }
      
      console.log("Using OpenAI API with GPT-4 model");
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text();
        console.error("OpenAI API error:", errorData);
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorData}`);
      }
      
      const openaiData = await openaiResponse.json();
      aiResponse = openaiData.choices[0].message.content;
    } else {
      throw new Error(`Unsupported AI model: ${settings.active_model}`);
    }
    
    console.log("Received AI response, parsing JSON");
    
    // Try to extract JSON from the response
    let workoutPlan;
    try {
      // Find JSON in the response (handling cases where the AI might add markdown or text)
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        aiResponse.match(/```\n([\s\S]*?)\n```/) || 
                        aiResponse.match(/({[\s\S]*?})/);
      
      const jsonString = jsonMatch ? jsonMatch[1] : aiResponse;
      workoutPlan = JSON.parse(jsonString);
      
      console.log("Successfully parsed workout plan JSON");
    } catch (error) {
      console.error("Error parsing AI response as JSON:", error);
      console.log("AI response:", aiResponse);
      throw new Error('Failed to parse workout plan from AI response');
    }
    
    // Validate and enhance the workout plan
    if (!workoutPlan || !workoutPlan.workout_sessions || !Array.isArray(workoutPlan.workout_sessions)) {
      console.error("Invalid workout plan format:", workoutPlan);
      throw new Error('Invalid workout plan format');
    }
    
    console.log("Validating exercise IDs in workout plan");
    
    // Create an ID lookup for quick reference
    const exerciseIdMap = new Map();
    const exerciseNameMap = new Map();
    
    exercises.forEach(ex => {
      exerciseIdMap.set(ex.id, ex);
      exerciseNameMap.set(ex.name.toLowerCase(), ex);
    });
    
    // Validate and correct exercise IDs
    let exerciseIssues = 0;
    workoutPlan.workout_sessions.forEach(session => {
      if (session.session_exercises && Array.isArray(session.session_exercises)) {
        session.session_exercises.forEach(exerciseItem => {
          if (!exerciseItem.exercise) {
            console.warn("Missing exercise object in workout plan");
            exerciseIssues++;
            return;
          }
          
          // Multiple fallback strategies for exercise ID resolution
          let validExercise = null;
          
          // Strategy 1: Check if the ID is valid
          if (exerciseItem.exercise.id && exerciseIdMap.has(exerciseItem.exercise.id)) {
            validExercise = exerciseIdMap.get(exerciseItem.exercise.id);
          } 
          // Strategy 2: Look up by name if ID is invalid
          else if (exerciseItem.exercise.name) {
            const lowerName = exerciseItem.exercise.name.toLowerCase();
            if (exerciseNameMap.has(lowerName)) {
              validExercise = exerciseNameMap.get(lowerName);
              console.log(`Resolved exercise "${exerciseItem.exercise.name}" by name lookup`);
            } else {
              // Strategy 3: Fuzzy match by name
              let bestMatch = null;
              let bestScore = 0;
              
              exerciseNameMap.forEach((ex, name) => {
                if (lowerName.includes(name) || name.includes(lowerName)) {
                  const score = Math.min(name.length, lowerName.length) / Math.max(name.length, lowerName.length);
                  if (score > bestScore) {
                    bestScore = score;
                    bestMatch = ex;
                  }
                }
              });
              
              if (bestMatch && bestScore > 0.7) {
                validExercise = bestMatch;
                console.log(`Fuzzy matched "${exerciseItem.exercise.name}" to "${validExercise.name}" (score: ${bestScore})`);
              } else {
                // Strategy 4: Fall back to a random exercise of the same type if specified
                const exerciseType = exerciseItem.exercise.type || preferences.preferred_exercise_types?.[0];
                if (exerciseType) {
                  const matchingExercises = exercises.filter(ex => ex.exercise_type === exerciseType);
                  if (matchingExercises.length > 0) {
                    validExercise = matchingExercises[Math.floor(Math.random() * matchingExercises.length)];
                    console.log(`Fallback: Replaced "${exerciseItem.exercise.name}" with random ${exerciseType} exercise: "${validExercise.name}"`);
                  }
                }
              }
            }
          }
          
          // Final fallback: use a random exercise
          if (!validExercise) {
            validExercise = exercises[Math.floor(Math.random() * exercises.length)];
            console.log(`No match found for "${exerciseItem.exercise.name || 'unnamed exercise'}". Using random exercise: ${validExercise.name}`);
            exerciseIssues++;
          }
          
          // Update with valid exercise data
          exerciseItem.exercise = {
            id: validExercise.id,
            name: validExercise.name,
            description: validExercise.description,
            gif_url: validExercise.gif_url,
            muscle_group: validExercise.muscle_group,
            exercise_type: validExercise.exercise_type
          };
        });
      }
    });
    
    console.log(`Workout plan validation complete. Fixed ${exerciseIssues} exercise issues.`);
    
    // Return the validated and enhanced workout plan
    return new Response(
      JSON.stringify({ workoutPlan }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in workout plan generation:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error in workout plan generation' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
