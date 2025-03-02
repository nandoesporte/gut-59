
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.29.0';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Groq API configuration
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') || '';
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Define types for workout preferences
interface WorkoutPreferences {
  age: number;
  weight: number;
  height: number;
  gender: "male" | "female";
  goal: "lose_weight" | "maintain" | "gain_mass";
  activity_level: "sedentary" | "light" | "moderate" | "intense";
  preferred_exercise_types: string[];
  available_equipment: string[];
  health_conditions?: string[];
}

// Define exercise interface
interface Exercise {
  id: string;
  name: string;
  description: string;
  gif_url: string;
  exercise_type: string;
  muscle_group: string;
  difficulty: string;
  equipment_needed: string[];
}

interface SessionExercise {
  exercise: {
    id: string;
    name: string;
    description?: string;
    gif_url?: string;
  };
  sets: number;
  reps: number;
  rest_time_seconds: number;
}

interface WorkoutSession {
  day_number: number;
  warmup_description: string;
  cooldown_description: string;
  session_exercises: SessionExercise[];
}

interface WorkoutPlan {
  goal: string;
  start_date: string;
  end_date: string;
  workout_sessions: WorkoutSession[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { preferences, userId, settings } = await req.json();
    
    if (!preferences || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: preferences, userId' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Received workout preferences:', JSON.stringify(preferences));
    console.log('User ID:', userId);
    console.log('AI settings:', settings);

    // Fetch exercises from the database based on preferences
    const availableEquipment = preferences.available_equipment || [];
    const preferredTypes = preferences.preferred_exercise_types || [];

    console.log('Querying exercises with types:', preferredTypes);
    console.log('Available equipment:', availableEquipment);

    let { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .in('exercise_type', preferredTypes);

    if (exercisesError) {
      console.error('Error fetching exercises:', exercisesError);
      return new Response(
        JSON.stringify({ error: `Error fetching exercises: ${exercisesError}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${exercises?.length || 0} exercises matching criteria`);

    // Filter exercises based on equipment if not in a gym
    if (!availableEquipment.includes('all')) {
      exercises = exercises?.filter(exercise => {
        // If no equipment needed, it's always available
        if (!exercise.equipment_needed || exercise.equipment_needed.length === 0) {
          return true;
        }
        
        // Check if the user has all required equipment
        return exercise.equipment_needed.some(eq => 
          availableEquipment.includes(eq.toLowerCase())
        );
      });
      
      console.log(`After equipment filtering: ${exercises?.length || 0} exercises`);
    }

    // Limit the number of exercises to avoid token limits
    const sampledExercises = exercises ? 
      exercises.sort(() => 0.5 - Math.random()).slice(0, 50) : 
      [];

    console.log(`Using ${sampledExercises.length} sampled exercises for plan generation`);

    // Build system prompt
    let systemPrompt = settings?.system_prompt || 
    `You are TRENE2025, an AI fitness coach specialized in creating personalized workout plans. 
    Your task is to create a detailed 7-day workout plan based on the user's preferences and available exercises.`;

    // Create user prompt with workout preferences and available exercises
    const userPrompt = `
    Generate a detailed 7-day workout plan based on these user preferences:
    - Age: ${preferences.age}
    - Weight: ${preferences.weight} kg
    - Height: ${preferences.height} cm
    - Gender: ${preferences.gender}
    - Goal: ${preferences.goal}
    - Activity Level: ${preferences.activity_level}
    - Preferred Exercise Types: ${preferences.preferred_exercise_types.join(', ')}
    - Available Equipment: ${preferences.available_equipment.join(', ')}
    ${preferences.health_conditions && preferences.health_conditions.length > 0 ? 
      `- Health Conditions: ${preferences.health_conditions.join(', ')}` : ''}

    Here are the available exercises you should choose from to create the workout plan:
    ${sampledExercises.map(ex => 
      `- ID: ${ex.id}, Name: ${ex.name}, Type: ${ex.exercise_type}, Muscle: ${ex.muscle_group}, Difficulty: ${ex.difficulty}`
    ).join('\n')}

    Create a structured workout plan with the following elements:
    1. A challenging but achievable 7-day schedule with rest days appropriate for the user's activity level
    2. For each workout day, include:
       - Day number (1-7)
       - A brief warmup description
       - A list of 4-6 exercises with:
         * The exercise ID (must match one from the list above)
         * Number of sets (typically 3-5)
         * Number of reps (8-15 for strength, 15-30 for endurance)
         * Rest time between sets in seconds (30-90 seconds)
       - A brief cooldown description
    
    Your response must be valid JSON following this exact structure:
    {
      "goal": "User's goal, summarized briefly",
      "start_date": "Current date (YYYY-MM-DD)",
      "end_date": "Date 7 days later (YYYY-MM-DD)",
      "workout_sessions": [
        {
          "day_number": 1,
          "warmup_description": "Brief warmup instructions",
          "cooldown_description": "Brief cooldown instructions",
          "session_exercises": [
            {
              "exercise": {
                "id": "exercise-uuid-from-list",
                "name": "Exercise name"
              },
              "sets": 3,
              "reps": 10,
              "rest_time_seconds": 60
            }
            // More exercises...
          ]
        }
        // More workout sessions...
      ]
    }
    
    IMPORTANT: Only include exercises from the provided list. Use the exact exercise IDs. The response must be valid JSON.
    `;

    console.log('Sending request to Groq API...');

    // Call Groq API with LLaMA 3 model
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Groq API error: ${errorText}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const groqData = await groqResponse.json();
    console.log('Groq API response received');

    // Extract the AI-generated workout plan
    let workoutPlanText = groqData.choices[0].message.content;
    console.log('Raw workout plan response:', workoutPlanText);

    // Extract JSON from the response (in case there's markdown or other text)
    let workoutPlan: WorkoutPlan;
    try {
      // Try to find JSON in the response
      const jsonRegex = /{[\s\S]*}/;
      const jsonMatch = workoutPlanText.match(jsonRegex);
      
      if (jsonMatch) {
        workoutPlanText = jsonMatch[0];
      }
      
      workoutPlan = JSON.parse(workoutPlanText);
      console.log('Successfully parsed workout plan JSON');
    } catch (e) {
      console.error('Error parsing workout plan JSON:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse workout plan JSON', 
          rawResponse: workoutPlanText 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enrich exercise data with details from database
    for (const session of workoutPlan.workout_sessions) {
      for (const sessionExercise of session.session_exercises) {
        // Find the full exercise details
        const exerciseDetails = exercises?.find(ex => ex.id === sessionExercise.exercise.id);
        if (exerciseDetails) {
          sessionExercise.exercise.description = exerciseDetails.description || '';
          sessionExercise.exercise.gif_url = exerciseDetails.gif_url || '';
        }
      }
    }

    console.log('Workout plan successfully generated and enriched');

    // Return the workout plan
    return new Response(
      JSON.stringify({ 
        workoutPlan,
        message: 'Workout plan generated successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-workout-plan-llama function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
