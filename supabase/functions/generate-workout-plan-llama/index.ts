
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
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    
    if (!llamaApiKey) {
      throw new Error('Missing LLAMA_API_KEY environment variable');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { preferences, user_id } = await req.json();
    
    console.log(`Received workout plan generation request for user: ${user_id}`);
    console.log(`User preferences: ${JSON.stringify(preferences)}`);

    // Fetch exercises from the database
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*');

    if (exercisesError) {
      console.error('Error fetching exercises:', exercisesError);
      throw new Error('Failed to fetch exercises from database');
    }

    console.log(`Retrieved ${exercises.length} exercises from database`);

    // Prepare the prompt for Llama
    const prompt = `
    I want you to create a personalized workout plan based on the following user preferences:
    
    ${JSON.stringify(preferences, null, 2)}
    
    The workout plan should include:
    - A weekly schedule with different workout sessions
    - Each session should focus on specific muscle groups
    - Exercises for each session, including sets, reps, and rest times
    - Warmup and cooldown instructions for each session
    
    For exercises, use ONLY the following exercises from our database:
    ${JSON.stringify(exercises.slice(0, 50).map(e => ({
      id: e.id,
      name: e.name,
      muscle_group: e.muscle_group || "not specified",
      exercise_type: e.exercise_type || "not specified"
    })), null, 2)}
    
    Format your response as valid JSON with the following structure:
    {
      "workout_plan": {
        "goal": string,
        "sessions": [
          {
            "day_number": number,
            "warmup_description": string,
            "cooldown_description": string,
            "exercises": [
              {
                "exercise_id": string, // ID from the exercise list above
                "sets": number,
                "reps": number,
                "rest_time_seconds": number
              }
            ]
          }
        ]
      }
    }
    
    Return only the JSON, nothing else.`;

    // Make request to Llama API
    const response = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3-8b-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a fitness expert that creates personalized workout plans.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error from Llama API:', error);
      throw new Error(`Llama API error: ${response.status} ${response.statusText}`);
    }

    const llamaData = await response.json();
    const workoutPlanContent = llamaData.choices[0]?.message?.content;
    
    if (!workoutPlanContent) {
      throw new Error('No content returned from Llama API');
    }

    console.log('Successfully received response from Llama');
    
    // Extract JSON from the response
    let workoutPlanJson;
    try {
      // Remove any markdown formatting if present
      const jsonContent = workoutPlanContent.replace(/```json|```/g, '').trim();
      workoutPlanJson = JSON.parse(jsonContent);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      console.log('Raw content:', workoutPlanContent);
      throw new Error('Failed to parse workout plan JSON from Llama response');
    }

    // Process the workout plan: enriching with exercise details
    const processedSessions = [];
    
    for (const session of workoutPlanJson.workout_plan.sessions) {
      const sessionExercises = [];
      
      for (const exercise of session.exercises) {
        // Find the exercise in our database
        const exerciseDetails = exercises.find(e => e.id === exercise.exercise_id);
        
        if (!exerciseDetails) {
          console.warn(`Exercise ID ${exercise.exercise_id} not found in database`);
          continue;
        }
        
        sessionExercises.push({
          id: crypto.randomUUID(),
          sets: exercise.sets,
          reps: exercise.reps,
          rest_time_seconds: exercise.rest_time_seconds,
          exercise: {
            id: exerciseDetails.id,
            name: exerciseDetails.name,
            gif_url: exerciseDetails.gif_url,
            description: exerciseDetails.description,
            muscle_group: exerciseDetails.muscle_group || null,
            exercise_type: exerciseDetails.exercise_type || null
          }
        });
      }
      
      processedSessions.push({
        id: crypto.randomUUID(),
        day_number: session.day_number,
        warmup_description: session.warmup_description,
        cooldown_description: session.cooldown_description,
        session_exercises: sessionExercises
      });
    }

    // Create the final workout plan object
    const finalWorkoutPlan = {
      id: crypto.randomUUID(),
      user_id: user_id,
      goal: workoutPlanJson.workout_plan.goal,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 4 weeks from now
      workout_sessions: processedSessions
    };

    // Store the generated workout plan in the database
    const { data: insertData, error: insertError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user_id,
        plan_data: finalWorkoutPlan,
        generated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error storing workout plan:', insertError);
      throw new Error('Failed to store the generated workout plan');
    }

    // Increment the workout plan generation count for this user
    await supabase.rpc('increment_workout_count', { user_id });

    console.log(`Workout plan generated and stored with ID: ${insertData.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        workoutPlan: finalWorkoutPlan,
        id: insertData.id
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred'
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
