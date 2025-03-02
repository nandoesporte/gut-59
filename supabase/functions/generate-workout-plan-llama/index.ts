
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
    const { preferences, userId, settings } = await req.json();
    
    if (!preferences || !userId) {
      throw new Error('Missing required parameters: preferences and userId are required');
    }
    
    console.log("Request received for user", userId);
    
    // Check if we have settings and if not, fetch default settings
    let modelSettings = settings;
    if (!modelSettings) {
      const { data: fetchedSettings, error: settingsError } = await supabase
        .from('ai_model_settings')
        .select('*')
        .eq('name', 'trene2025')
        .single();
        
      if (settingsError) {
        throw new Error(`Error fetching AI model settings: ${settingsError.message}`);
      }
      
      modelSettings = fetchedSettings;
    }
    
    // Determine which model to use based on settings
    const useGroq = modelSettings?.active_model === 'groq' || modelSettings?.active_model === 'llama3';
    const groqApiKey = modelSettings?.groq_api_key;
    
    // Query to get available exercises
    const { data: availableExercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*');
      
    if (exercisesError) {
      throw new Error(`Error fetching exercises: ${exercisesError.message}`);
    }
    
    // Start constructing the prompt
    let prompt = `You are a professional fitness coach creating a personalized 7-day workout plan. Here are the user's preferences and details:

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

Return only the JSON object as described above.`;

    let llmResponse;
    
    // If we have a Groq API key and should use Groq
    if (useGroq && groqApiKey) {
      console.log("Using Groq API for workout plan generation");
      
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
              content: "You are an expert fitness coach that specializes in creating personalized workout plans. You always respond with valid JSON."
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
        throw new Error(`Groq API error: ${response.status} - ${responseText}`);
      }

      const groqData = await response.json();
      
      if (!groqData.choices || groqData.choices.length === 0) {
        throw new Error('No response from Groq API');
      }

      llmResponse = groqData.choices[0].message.content;
    } 
    // If we don't have a Groq API key or shouldn't use Groq
    else {
      // Check if we should use Groq but don't have an API key
      if (useGroq) {
        console.log("Groq API was selected but no API key found. Using fallback response.");
        
        // Create a simplified fallback workout plan
        llmResponse = JSON.stringify({
          goal: `${preferences.goal} workout plan (FALLBACK: Groq API key missing)`,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          workout_sessions: [
            {
              day_number: 1,
              warmup_description: "5-10 minutes of light cardio followed by dynamic stretching",
              cooldown_description: "5 minutes of static stretching, focusing on worked muscle groups",
              session_exercises: availableExercises.slice(0, 4).map((ex, i) => ({
                exercise: {
                  id: ex.id,
                  name: ex.name,
                  description: ex.description || "",
                  muscle_group: ex.muscle_group,
                  exercise_type: ex.exercise_type,
                  gif_url: ex.gif_url || ""
                },
                sets: 3,
                reps: 10,
                rest_time_seconds: 60
              }))
            }
          ]
        });
      } else {
        // In a real implementation, you would call another LLM service here
        throw new Error('Alternative LLM service not implemented. Please configure Groq API key in settings.');
      }
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
