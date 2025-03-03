
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.1';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    // Create a Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get request payload
    const { preferences, userId, settings, forceTrene2025 } = await req.json();
    
    if (!preferences || !userId) {
      throw new Error('Missing required parameters: preferences and userId are required');
    }
    
    console.log("Request received for user", userId);
    console.log("Force TRENE2025:", forceTrene2025 ? "Yes" : "No");
    
    // Check if we have settings and if not, fetch default settings
    let modelSettings = settings;
    if (!modelSettings) {
      const { data: fetchedSettings, error: settingsError } = await supabase
        .from('ai_model_settings')
        .select('*')
        .eq('name', 'trene2025')
        .single();
        
      if (settingsError) {
        console.log("Error fetching AI model settings:", settingsError.message);
        modelSettings = {
          active_model: 'fallback',
          name: 'trene2025'
        };
      } else {
        modelSettings = fetchedSettings;
      }
    }
    
    // Determine which model to use based on settings
    const useGroq = modelSettings?.active_model === 'groq' || modelSettings?.active_model === 'llama3';
    const groqApiKey = modelSettings?.groq_api_key;
    
    // Log model selection decision
    console.log("Model selection:", useGroq ? "Using Groq" : "Using fallback model");
    if (useGroq && !groqApiKey) {
      console.log("Groq API key missing, will use fallback model");
    }
    
    // Query to get available exercises
    const { data: availableExercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*');
      
    if (exercisesError) {
      throw new Error(`Error fetching exercises: ${exercisesError.message}`);
    }
    
    console.log(`Found ${availableExercises.length} available exercises`);
    
    // Start constructing the prompt
    let prompt = `You are TRENE2025, a professional fitness coach creating a personalized 7-day workout plan. Here are the user's preferences and details:

- Age: ${preferences.age}
- Gender: ${preferences.gender}
- Weight: ${preferences.weight} kg
- Height: ${preferences.height} cm
- Goal: ${preferences.goal}
- Activity Level: ${preferences.activity_level}
- Preferred Exercise Types: ${preferences.preferred_exercise_types.join(', ')}
- Available Equipment: ${preferences.available_equipment.join(', ')}
`;

    if (preferences.health_conditions && preferences.health_conditions.length > 0) {
      prompt += `- Health Conditions: ${preferences.health_conditions.join(', ')}\n`;
    }

    prompt += `
Based on this information, create a detailed 7-day workout plan. The plan should be structured as a JSON object with the following format:

{
  "goal": "A clear statement about the goal of this workout plan",
  "start_date": "2023-05-01",
  "end_date": "2023-05-07",
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "5-10 minutes of light cardio followed by dynamic stretching",
      "cooldown_description": "5 minutes of static stretching, focusing on worked muscle groups",
      "session_exercises": [
        {
          "exercise": {
            "id": 123,
            "name": "Exercise Name",
            "description": "Brief description",
            "muscle_group": "Targeted muscles",
            "exercise_type": "Type of exercise",
            "gif_url": "URL to exercise animation"
          },
          "sets": 3,
          "reps": "10-12",
          "rest_time_seconds": 60
        }
      ]
    }
  ]
}

You must choose exercises from the following list of available exercises:
`;

    // Add the available exercises to the prompt
    availableExercises.forEach(exercise => {
      prompt += `
ID: ${exercise.id} - ${exercise.name} - Muscle Group: ${exercise.muscle_group} - Type: ${exercise.exercise_type}`;
    });

    prompt += `
Important guidelines:
1. Make sure all exercises are from the provided list
2. Include the correct exercise ID from the list
3. Provide realistic sets, reps, and rest times
4. Tailor the plan to the user's goals and preferences
5. Create a balanced program that includes proper warmup and cooldown for each session
6. Structure rest days appropriately based on the exercise intensity
7. ONLY use JSON format in your response, without any additional text
8. Your name is TRENE2025, make sure to include this in the workout plan as the coach's name

Return only the JSON object as described above.`;

    let llmResponse;
    
    // If we have a Groq API key and should use Groq
    if (useGroq && groqApiKey) {
      console.log("Using Groq API for workout plan generation");
      
      try {
        // Make API call to Groq
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: "llama3-8b-8192",
            messages: [
              {
                role: "system",
                content: "You are TRENE2025, an expert fitness coach that specializes in creating personalized workout plans. You always respond with valid JSON."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const responseText = await response.text();
          console.error(`Groq API error: ${response.status} - ${responseText}`);
          throw new Error(`Groq API error: ${response.status}`);
        }

        const groqData = await response.json();
        
        if (!groqData.choices || groqData.choices.length === 0) {
          throw new Error('No response from Groq API');
        }

        llmResponse = groqData.choices[0].message.content;
        console.log("Successfully received response from Groq API");
      } catch (error) {
        console.error("Error calling Groq API:", error.message);
        // Fall through to the fallback
        useGroq = false;
      }
    }
    
    // If Groq API failed or we don't have a key/shouldn't use Groq
    if (!llmResponse) {
      console.log("Using fallback method for workout plan generation");
      
      // Create a simplified fallback workout plan
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 6);
      
      // Format dates as YYYY-MM-DD
      const startDateFormatted = today.toISOString().split('T')[0];
      const endDateFormatted = endDate.toISOString().split('T')[0];
      
      // Filter exercises based on preferences
      const preferredTypes = preferences.preferred_exercise_types || [];
      const filteredExercises = preferredTypes.length > 0 
        ? availableExercises.filter(ex => preferredTypes.includes(ex.exercise_type))
        : availableExercises;
        
      // If no exercises match the preferences, use all exercises
      const exercisesToUse = filteredExercises.length > 0 ? filteredExercises : availableExercises;
      
      // Create a 7-day workout plan
      const workoutPlan = {
        goal: `${preferences.goal} (Gerado pelo TRENE2025)`,
        start_date: startDateFormatted,
        end_date: endDateFormatted,
        workout_sessions: []
      };
      
      // Function to get random exercises
      const getRandomExercises = (count, muscleGroup = null) => {
        let filtered = exercisesToUse;
        if (muscleGroup) {
          filtered = exercisesToUse.filter(ex => ex.muscle_group.toLowerCase().includes(muscleGroup.toLowerCase()));
          // If not enough exercises match the muscle group, use all exercises
          if (filtered.length < count) {
            filtered = exercisesToUse;
          }
        }
        
        // Shuffle array and take first N items
        return filtered
          .sort(() => 0.5 - Math.random())
          .slice(0, count)
          .map(ex => ({
            exercise: {
              id: ex.id,
              name: ex.name,
              description: ex.description || "",
              muscle_group: ex.muscle_group,
              exercise_type: ex.exercise_type,
              gif_url: ex.gif_url || ""
            },
            sets: 3,
            reps: "10-12",
            rest_time_seconds: 60
          }));
      };
      
      // Create workout sessions based on the goal
      if (preferences.goal.toLowerCase().includes("lose weight") || 
          preferences.goal.toLowerCase().includes("weight loss")) {
        // Weight loss focused plan with cardio
        workoutPlan.workout_sessions = [
          {
            day_number: 1,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(4, "chest")
          },
          {
            day_number: 2,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(5, "legs")
          },
          {
            day_number: 3,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(4, "cardio")
          },
          {
            day_number: 4,
            warmup_description: "Descanso ativo - caminhada leve",
            cooldown_description: "Alongamento geral",
            session_exercises: []
          },
          {
            day_number: 5,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(4, "back")
          },
          {
            day_number: 6,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(5, "full body")
          },
          {
            day_number: 7,
            warmup_description: "Descanso total",
            cooldown_description: "Alongamento geral se desejar",
            session_exercises: []
          }
        ];
      } else if (preferences.goal.toLowerCase().includes("muscle") || 
                preferences.goal.toLowerCase().includes("strength")) {
        // Muscle gain focused plan
        workoutPlan.workout_sessions = [
          {
            day_number: 1,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(5, "chest")
          },
          {
            day_number: 2,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(5, "back")
          },
          {
            day_number: 3,
            warmup_description: "Descanso ativo - caminhada leve",
            cooldown_description: "Alongamento geral",
            session_exercises: []
          },
          {
            day_number: 4,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(5, "legs")
          },
          {
            day_number: 5,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(5, "shoulders")
          },
          {
            day_number: 6,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(4, "arms")
          },
          {
            day_number: 7,
            warmup_description: "Descanso total",
            cooldown_description: "Alongamento geral se desejar",
            session_exercises: []
          }
        ];
      } else {
        // General fitness or other goals
        workoutPlan.workout_sessions = [
          {
            day_number: 1,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(4, "upper body")
          },
          {
            day_number: 2,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(4, "lower body")
          },
          {
            day_number: 3,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(3, "cardio")
          },
          {
            day_number: 4,
            warmup_description: "Descanso ativo - caminhada leve",
            cooldown_description: "Alongamento geral",
            session_exercises: []
          },
          {
            day_number: 5,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(4, "core")
          },
          {
            day_number: 6,
            warmup_description: "5 minutos de cardio leve e alongamento dinâmico",
            cooldown_description: "5 minutos de alongamento estático",
            session_exercises: getRandomExercises(4, "full body")
          },
          {
            day_number: 7,
            warmup_description: "Descanso total",
            cooldown_description: "Alongamento geral se desejar",
            session_exercises: []
          }
        ];
      }
      
      // Remove empty days (rest days without exercises)
      workoutPlan.workout_sessions = workoutPlan.workout_sessions.filter(
        session => session.session_exercises.length > 0 || session.day_number % 3 === 0
      );
      
      // Re-number the days
      workoutPlan.workout_sessions.forEach((session, index) => {
        session.day_number = index + 1;
      });
      
      // Convert to string
      llmResponse = JSON.stringify(workoutPlan);
    }
    
    try {
      // Extract the JSON object from the LLM response
      let workoutPlanJson;
      
      // Try to parse the whole response as JSON first
      try {
        workoutPlanJson = JSON.parse(llmResponse);
      } catch (e) {
        // If that fails, try to extract JSON from the text
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          workoutPlanJson = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not extract valid JSON from LLM response');
        }
      }

      // Ensure we have a start_date and end_date
      if (!workoutPlanJson.start_date || !workoutPlanJson.end_date) {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 6);
        
        workoutPlanJson.start_date = workoutPlanJson.start_date || today.toISOString().split('T')[0];
        workoutPlanJson.end_date = workoutPlanJson.end_date || endDate.toISOString().split('T')[0];
      }
      
      // Ensure all workout_sessions have an array of session_exercises
      workoutPlanJson.workout_sessions.forEach(session => {
        if (!session.session_exercises) {
          session.session_exercises = [];
        }
      });
      
      // Ensure all goal contains TRENE2025 reference
      if (!workoutPlanJson.goal.includes("TRENE2025")) {
        workoutPlanJson.goal += " (Gerado pelo TRENE2025)";
      }
      
      console.log(`Successfully created workout plan with ${workoutPlanJson.workout_sessions.length} sessions`);
      
      // Return the workout plan
      return new Response(
        JSON.stringify({ 
          workoutPlan: workoutPlanJson
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error(`Error parsing workout plan: ${error.message}`);
      throw new Error(`Error parsing workout plan: ${error.message}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
