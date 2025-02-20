
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Fetch available exercises from the database
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .in('exercise_type', preferences.preferred_exercise_types)
      .in('equipment_needed', preferences.available_equipment);

    if (exercisesError) {
      throw new Error('Failed to fetch exercises');
    }

    console.log('Generating workout plan with preferences:', preferences);
    console.log('Available exercises:', exercises.length);

    // Create system prompt for workout plan generation
    const systemPrompt = `You are an expert personal trainer tasked with creating personalized workout plans. 
    Create a plan based on these preferences:
    - Age: ${preferences.age}
    - Gender: ${preferences.gender}
    - Weight: ${preferences.weight}kg
    - Height: ${preferences.height}cm
    - Goal: ${preferences.goal}
    - Activity Level: ${preferences.activity_level}
    - Available Equipment: ${preferences.available_equipment.join(', ')}
    
    Format the response as a JSON object with:
    1. A 7-day workout plan
    2. Each day should have:
       - warmup_description
       - cooldown_description
       - 4-6 exercises from the provided list
       - For each exercise specify: sets, reps, and rest_time_seconds
    3. Consider the user's goals and fitness level
    4. Structure the response exactly as shown in the example.`;

    const userPrompt = `Available exercises: ${JSON.stringify(exercises.map(e => ({
      id: e.id,
      name: e.name,
      type: e.exercise_type,
      equipment: e.equipment_needed,
      difficulty: e.difficulty
    })))}

    Example response format:
    {
      "workout_sessions": [
        {
          "day_number": 1,
          "warmup_description": "5 minutes light cardio followed by dynamic stretches",
          "cooldown_description": "5 minutes static stretching",
          "exercises": [
            {
              "name": "Push-ups",
              "sets": 3,
              "reps": 12,
              "rest_time_seconds": 60
            }
          ]
        }
      ]
    }`;

    // Generate workout plan using GPT
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    const gptResponse = await response.json();
    
    if (!gptResponse.choices?.[0]?.message?.content) {
      throw new Error('Failed to generate workout plan');
    }

    // Parse the generated plan
    const workoutPlan = JSON.parse(gptResponse.choices[0].message.content);

    // Save the plan to the database
    const { data: planData, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        goal: preferences.goal,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      })
      .select()
      .single();

    if (planError) {
      throw new Error('Failed to save workout plan');
    }

    // Save workout sessions
    const sessionsToInsert = workoutPlan.workout_sessions.map(session => ({
      plan_id: planData.id,
      day_number: session.day_number,
      warmup_description: session.warmup_description,
      cooldown_description: session.cooldown_description,
    }));

    const { data: sessionsData, error: sessionsError } = await supabase
      .from('workout_sessions')
      .insert(sessionsToInsert)
      .select();

    if (sessionsError) {
      throw new Error('Failed to save workout sessions');
    }

    // Save exercises for each session
    for (let i = 0; i < sessionsData.length; i++) {
      const session = sessionsData[i];
      const exercises = workoutPlan.workout_sessions[i].exercises;
      
      const exercisesToInsert = exercises.map((exercise, index) => ({
        session_id: session.id,
        order_in_session: index + 1,
        sets: exercise.sets,
        reps: exercise.reps,
        rest_time_seconds: exercise.rest_time_seconds,
        exercise_id: getExerciseIdByName(exercises, exercise.name),
      }));

      const { error: exercisesError } = await supabase
        .from('session_exercises')
        .insert(exercisesToInsert);

      if (exercisesError) {
        throw new Error('Failed to save session exercises');
      }
    }

    // Return the complete workout plan
    return new Response(JSON.stringify({
      id: planData.id,
      user_id: userId,
      goal: preferences.goal,
      start_date: planData.start_date,
      end_date: planData.end_date,
      workout_sessions: workoutPlan.workout_sessions,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating workout plan:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getExerciseIdByName(exercises: any[], name: string): string | undefined {
  const exercise = exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
  return exercise?.id;
}
