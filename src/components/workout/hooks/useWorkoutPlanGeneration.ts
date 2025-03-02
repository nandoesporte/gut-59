
import { useState, useEffect } from "react";
import { WorkoutPreferences } from "../types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPlan } from "../types/workout-plan";

// Mock progress data for now
const mockProgressData = [
  { day: 1, completion: 0 },
  { day: 2, completion: 0 },
  { day: 3, completion: 0 },
  { day: 4, completion: 0 },
  { day: 5, completion: 0 },
  { day: 6, completion: 0 },
  { day: 7, completion: 0 },
];

export const useWorkoutPlanGeneration = (preferences: WorkoutPreferences) => {
  const [loading, setLoading] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [progressData, setProgressData] = useState(mockProgressData);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get AI model settings
      const { data: aiSettings } = await supabase
        .from('ai_model_settings')
        .select('*')
        .eq('name', 'trene2025')
        .single();
      
      if (!aiSettings) {
        throw new Error("AI model settings not found");
      }
      
      // Call the edge function to generate the workout plan
      const { data, error: functionError } = await supabase.functions.invoke(
        "generate-workout-plan-llama",
        {
          body: { 
            preferences, 
            userId: user.id,
            settings: aiSettings
          },
        }
      );
      
      if (functionError) {
        console.error("Edge function error:", functionError);
        throw new Error(`Error generating workout plan: ${functionError.message}`);
      }
      
      if (!data || !data.workoutPlan) {
        throw new Error("Invalid response from workout plan generator");
      }
      
      // Save the workout plan to the database
      const planData = data.workoutPlan;
      
      // First, save the main workout plan
      const { data: savedPlan, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          goal: planData.goal,
          start_date: planData.start_date || new Date().toISOString().split('T')[0],
          end_date: planData.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .select()
        .single();
      
      if (planError) {
        console.error("Error saving workout plan:", planError);
        throw new Error(`Error saving workout plan: ${planError.message}`);
      }
      
      // Then save each workout session
      if (planData.workout_sessions && Array.isArray(planData.workout_sessions)) {
        for (const session of planData.workout_sessions) {
          // Insert the session
          const { data: savedSession, error: sessionError } = await supabase
            .from('workout_sessions')
            .insert({
              plan_id: savedPlan.id,
              day_number: session.day_number,
              warmup_description: session.warmup_description,
              cooldown_description: session.cooldown_description,
            })
            .select()
            .single();
          
          if (sessionError) {
            console.error("Error saving workout session:", sessionError);
            continue; // Skip to the next session if there's an error
          }
          
          // Then save each exercise in the session
          if (session.session_exercises && Array.isArray(session.session_exercises)) {
            for (const exercise of session.session_exercises) {
              // Insert the session exercise
              const { error: exerciseError } = await supabase
                .from('session_exercises')
                .insert({
                  session_id: savedSession.id,
                  exercise_id: exercise.exercise.id,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  rest_time_seconds: exercise.rest_time_seconds,
                  order_in_session: session.session_exercises.indexOf(exercise),
                });
                
              if (exerciseError) {
                console.error("Error saving exercise:", exerciseError);
              }
            }
          }
        }
      }
      
      // Set the workout plan
      planData.id = savedPlan.id;
      planData.user_id = user.id;
      setWorkoutPlan(planData);
      
      // Update profile generation count
      await supabase.rpc('increment_workout_generation_count', { p_user_id: user.id });
      
      toast.success("Plano de treino gerado com sucesso!");
    } catch (err: any) {
      console.error("Error in workout plan generation:", err);
      setError(err.message || "Erro ao gerar plano de treino");
      toast.error(err.message || "Erro ao gerar plano de treino");
    } finally {
      setLoading(false);
    }
  };

  // Generate the plan when the component mounts
  useEffect(() => {
    generatePlan();
  }, []);

  return { loading, workoutPlan, progressData, error, generatePlan };
};
