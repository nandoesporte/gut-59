import { WorkoutPreferences } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { WorkoutPlan } from "../types/workout-plan";

const PLAN_GENERATION_COUNT_KEY = "plan_generation_count";

export const generateWorkoutPlanWithTrenner2025 = async (
  preferences: WorkoutPreferences, 
  userId: string,
  aiSettings?: any,
  requestId?: string
) => {
  try {
    console.log("Generating workout plan with Trenner2025 agent...");
    console.log("Preferences:", JSON.stringify(preferences, null, 2));
    
    // Determine days per week based on activity level
    let daysPerWeek = 3;
    switch (preferences.activity_level) {
      case "sedentary": daysPerWeek = 2; break;
      case "light": daysPerWeek = 3; break;
      case "moderate": daysPerWeek = 5; break;
      case "intense": daysPerWeek = 6; break;
    }
    console.log(`Activity level: ${preferences.activity_level}, Training days: ${daysPerWeek}`);

    // Generate a unique request ID if not provided
    const reqId = requestId || `${userId}_${Date.now()}`;
    console.log(`Using request ID: ${reqId}`);

    // Get available exercises from database
    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("*");

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      throw new Error(`Erro ao buscar exercícios: ${exercisesError.message}`);
    }

    console.log(`Fetched ${exercises.length} exercises from the database`);

    // Filter exercises based on user preferences
    console.log("Starting comprehensive exercise filtering based on user preferences...");
    console.log(`Total exercises in database: ${exercises.length}`);

    // 1. Filter by exercise types if specified
    let filteredExercises = exercises;
    if (preferences.preferred_exercise_types && preferences.preferred_exercise_types.length > 0) {
      // If 'all' is included in preferred types, don't filter
      if (!preferences.preferred_exercise_types.includes('all')) {
        filteredExercises = exercises.filter(ex => 
          preferences.preferred_exercise_types.includes(ex.exercise_type)
        );
      }
    }
    console.log(`After filtering by exercise types: ${filteredExercises.length} (removed ${exercises.length - filteredExercises.length})`);

    // 2. Ensure exercises have valid GIF URLs
    const exercisesWithGifs = filteredExercises.filter(ex => ex.gif_url && ex.gif_url.trim() !== '');
    console.log(`Exercises with valid GIF URLs: ${exercisesWithGifs.length} out of ${filteredExercises.length}`);

    // 3. Organize by muscle group for balanced routine
    const muscleGroups = ["chest", "back", "legs", "shoulders", "arms", "core", "full_body"];
    const exercisesByMuscle = {};
    
    muscleGroups.forEach(group => {
      exercisesByMuscle[group] = exercisesWithGifs.filter(ex => ex.muscle_group === group);
      console.log(`- ${group}: ${exercisesByMuscle[group].length} exercises`);
    });

    // 4. Select a subset of exercises to use in the plan (at least 5-8 for each muscle group)
    const selectedExercises = [];
    const exercisesPerGroup = 12; // Aim for 12 exercises per muscle group

    for (const group of muscleGroups) {
      // Shuffle available exercises for this muscle group
      const shuffled = [...exercisesByMuscle[group]].sort(() => 0.5 - Math.random());
      
      // Select up to exercisesPerGroup exercises for this muscle group
      const selected = shuffled.slice(0, exercisesPerGroup);
      selectedExercises.push(...selected);
      
      // Log some of the selected exercises
      if (selected.length > 0) {
        console.log(`Top muscle groups: ${selected.slice(0, Math.min(6, selected.length)).map(e => e.muscle_group).join(', ')}`);
      }
    }

    console.log(`Filtered ${selectedExercises.length} exercises from ${exercises.length} total exercises based on user preferences`);

    // Call edge function for workout plan generation using the simplified function
    console.log(`Invoking edge function: generate-workout-plan`);
    const startTime = Date.now();
    const { data: workoutPlan, error } = await supabase.functions.invoke('generate-workout-plan', {
      body: {
        preferences: {
          ...preferences,
          days_per_week: daysPerWeek
        },
        userId,
        requestId: reqId
      }
    });
    const endTime = Date.now();
    console.log(`Edge function completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);

    if (error) {
      console.error("Error invoking generate-workout-plan function:", error);
      throw new Error(`Erro ao gerar plano de treino: ${error.message}`);
    }

    return {
      workoutPlan,
      rawResponse: workoutPlan
    };
  } catch (error) {
    console.error("Error generating workout plan:", error);
    return {
      error: error instanceof Error ? error.message : "Erro desconhecido",
      rawResponse: null
    };
  }
};

export const saveWorkoutPlan = async (plan: any, userId: string): Promise<WorkoutPlan | null> => {
  try {
    // Basic validation
    if (!plan || !plan.id || !userId) {
      console.error("Invalid plan or user ID provided");
      return null;
    }

    // Prepare the workout plan data for saving
    const workoutPlanData = {
      id: plan.id,
      user_id: userId,
      goal: plan.goal || 'general fitness',
      start_date: plan.start_date || new Date().toISOString().split('T')[0],
      end_date: plan.end_date || new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
      created_at: plan.created_at || new Date().toISOString(),
    };

    // Save the workout plan to the database
    const { data: savedPlan, error: planError } = await supabase
      .from('workout_plans')
      .upsert([workoutPlanData], { onConflict: 'id' })
      .select()
      .single();

    if (planError) {
      console.error("Error saving workout plan:", planError);
      throw new Error(`Erro ao salvar plano de treino: ${planError.message}`);
    }

    // Process and save workout sessions
    if (plan.workout_sessions && Array.isArray(plan.workout_sessions)) {
      for (const session of plan.workout_sessions) {
        const sessionData = {
          id: session.id,
          plan_id: plan.id,
          day_number: session.day_number,
          day_name: session.day_name,
          focus: session.focus,
          warmup_description: session.warmup_description,
          cooldown_description: session.cooldown_description,
        };

        const { error: sessionError } = await supabase
          .from('workout_sessions')
          .upsert([sessionData], { onConflict: 'id' });

        if (sessionError) {
          console.error("Error saving workout session:", sessionError);
          continue; // Skip to the next session
        }

        // Process and save session exercises
        if (session.session_exercises && Array.isArray(session.session_exercises)) {
          for (const exercise of session.session_exercises) {
            const exerciseData = {
              id: exercise.id,
              session_id: session.id,
              exercise_id: exercise.exercise?.id,
              sets: exercise.sets,
              reps: exercise.reps,
              rest_time_seconds: exercise.rest_time_seconds,
              order_in_session: exercise.order_in_session,
            };

            const { error: exerciseError } = await supabase
              .from('session_exercises')
              .upsert([exerciseData], { onConflict: 'id' });

            if (exerciseError) {
              console.error("Error saving session exercise:", exerciseError);
            }
          }
        }
      }
    }

    console.log("Workout plan and associated data saved successfully");
    return savedPlan as WorkoutPlan;
  } catch (error) {
    console.error("Error in saveWorkoutPlan:", error);
    return null;
  }
};

export const updatePlanGenerationCount = async (userId: string) => {
  try {
    if (!userId) {
      console.error("User ID is required to update plan generation count.");
      return;
    }

    // Check if the user already has a count
    const { data, error: selectError } = await supabase
      .from('plan_generation_counts')
      .select('workout_count')
      .eq('user_id', userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error("Error checking existing plan generation count:", selectError);
      return;
    }

    if (data) {
      // Increment the existing count
      const newCount = (data.workout_count || 0) + 1;
      const { error: updateError } = await supabase
        .from('plan_generation_counts')
        .update({ workout_count: newCount })
        .eq('user_id', userId);

      if (updateError) {
        console.error("Error updating plan generation count:", updateError);
        return;
      }

      console.log(`Plan generation count updated to ${newCount} for user ${userId}`);
    } else {
      // Insert a new count record
      const { error: insertError } = await supabase
        .from('plan_generation_counts')
        .insert([{ user_id: userId, workout_count: 1 }]);

      if (insertError) {
        console.error("Error inserting new plan generation count:", insertError);
        return;
      }

      console.log(`New plan generation count created for user ${userId}`);
    }
  } catch (error) {
    console.error("Error updating plan generation count:", error);
  }
};
