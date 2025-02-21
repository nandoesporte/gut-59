
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

const calculateFitnessLevel = (preferences: WorkoutPreferences): "beginner" | "intermediate" | "advanced" => {
  const { activity_level } = preferences;
  
  switch (activity_level) {
    case "intense":
      return "advanced";
    case "moderate":
      return "intermediate";
    default:
      return "beginner";
  }
};

const determineWeightRecommendation = (
  exercise: any, 
  userWeight: number, 
  gender: string,
  fitnessLevel: string
) => {
  // Base multipliers for different fitness levels
  const levelMultipliers = {
    beginner: 0.4,
    intermediate: 0.6,
    advanced: 0.8
  };

  // Gender adjustment factor
  const genderFactor = gender === 'female' ? 0.8 : 1;

  // Exercise type specific base weights (as percentage of body weight)
  const exerciseBaseWeights: { [key: string]: number } = {
    "squat": 1,
    "deadlift": 1.2,
    "bench_press": 0.8,
    "shoulder_press": 0.4,
    "row": 0.6,
    "lunges": 0.3,
    // Add more exercises as needed
  };

  const baseWeight = exerciseBaseWeights[exercise.name.toLowerCase()] || 0.3;
  const multiplier = levelMultipliers[fitnessLevel as keyof typeof levelMultipliers];

  const recommendedWeight = Math.round(userWeight * baseWeight * multiplier * genderFactor);

  // Format weight recommendations based on fitness level
  return {
    beginner: `${Math.round(recommendedWeight * 0.7)}kg - ${recommendedWeight}kg`,
    intermediate: `${recommendedWeight}kg - ${Math.round(recommendedWeight * 1.2)}kg`,
    advanced: `${Math.round(recommendedWeight * 1.2)}kg - ${Math.round(recommendedWeight * 1.5)}kg`
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { preferences, userId } = await req.json()

    console.log("Received request with:", { preferences, userId });

    if (!preferences || !userId) {
      console.error("Missing required parameters");
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch appropriate exercises based on preferences and equipment
    const { data: exercises, error: exercisesError } = await supabaseClient
      .from('exercises')
      .select('*')
      .order('created_at')

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      return new Response(
        JSON.stringify({ error: 'Error fetching exercises' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (!exercises || exercises.length === 0) {
      console.error("No exercises found in database");
      return new Response(
        JSON.stringify({ error: 'No exercises available' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    console.log(`Found ${exercises.length} exercises`);

    // Determine user's fitness level
    const fitnessLevel = calculateFitnessLevel(preferences)
    console.log("Calculated fitness level:", fitnessLevel)

    // Filter exercises based on user preferences
    const filteredExercises = exercises.filter(ex => {
      // Check if exercise type matches preferences
      const matchesType = preferences.preferred_exercise_types.includes(ex.exercise_type);
      
      // Check if required equipment is available
      const hasEquipment = preferences.available_equipment.includes('all') || 
                          !ex.equipment_needed || 
                          ex.equipment_needed.some((eq: string) => preferences.available_equipment.includes(eq));
      
      return matchesType && hasEquipment;
    });

    if (filteredExercises.length === 0) {
      console.error("No suitable exercises found after filtering");
      return new Response(
        JSON.stringify({ error: 'No suitable exercises found for your preferences' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Create workout sessions
    const workoutSessions = Array.from({ length: 3 }, (_, i) => {
      const dayExercises = filteredExercises
        .slice(i * 4, (i + 1) * 4)
        .map(exercise => ({
          name: exercise.name,
          sets: Math.min(Math.max(3, exercise.min_sets || 3), exercise.max_sets || 5),
          reps: Math.min(Math.max(8, exercise.min_reps || 8), exercise.max_reps || 12),
          rest_time_seconds: exercise.rest_time_seconds || 60,
          gifUrl: exercise.gif_url,
          weight_recommendation: determineWeightRecommendation(
            exercise,
            preferences.weight,
            preferences.gender,
            fitnessLevel
          ),
          notes: exercise.description
        }));

      return {
        day_number: i + 1,
        warmup_description: "5-10 minutos de aquecimento cardio leve seguido por exercícios de mobilidade",
        cooldown_description: "5 minutos de alongamento para os grupos musculares trabalhados",
        exercises: dayExercises
      };
    });

    // Create the workout plan
    const workoutPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      goal: preferences.goal,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      workout_sessions: workoutSessions,
      user_fitness_level: fitnessLevel
    };

    // Save the workout plan
    const { error: saveError } = await supabaseClient
      .from('workout_plans')
      .insert([workoutPlan]);

    if (saveError) {
      console.error("Error saving workout plan:", saveError);
      return new Response(
        JSON.stringify({ error: 'Error saving workout plan' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log("Successfully created workout plan");
    return new Response(
      JSON.stringify(workoutPlan),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in generate-workout-plan:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
