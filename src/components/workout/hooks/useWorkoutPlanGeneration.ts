
import { useState, useEffect } from "react";
import { WorkoutPreferences } from "../types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPlan } from "../types/workout-plan";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

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

// Timezone configuration
const BRAZIL_TIMEZONE = "America/Sao_Paulo";

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
        throw new Error("Usuário não autenticado");
      }
      
      // Get AI model settings - always use TRENE2025
      const { data: aiSettings, error: settingsError } = await supabase
        .from('ai_model_settings')
        .select('*')
        .eq('name', 'trene2025')
        .single();
      
      if (settingsError) {
        console.warn("Configurações do modelo de IA não encontradas. Usando padrões:", settingsError);
      }
      
      if (aiSettings && (!aiSettings.groq_api_key || aiSettings.groq_api_key.trim() === '')) {
        // Verificar se precisamos da chave Groq com base no modelo ativo
        if (aiSettings.active_model === 'groq' || aiSettings.active_model === 'llama3') {
          console.warn("Chave API Groq não configurada, necessária para os modelos Llama 3 e Groq");
          toast.warning("Chave API Groq não configurada. Contate o administrador para melhor qualidade dos planos.");
        }
      }
      
      // Ensure preferences arrays are defined before passing to the edge function
      const safePreferences = {
        ...preferences,
        preferred_exercise_types: Array.isArray(preferences.preferred_exercise_types) 
          ? preferences.preferred_exercise_types 
          : [],
        available_equipment: Array.isArray(preferences.available_equipment) 
          ? preferences.available_equipment 
          : [],
        health_conditions: Array.isArray(preferences.health_conditions) 
          ? preferences.health_conditions 
          : []
      };
      
      console.log("Chamando função Edge com preferências:", safePreferences);
      console.log("Usando agente obrigatório: TRENE2025");
      
      // Call the edge function to generate the workout plan without auth headers, 
      // forcing the use of TRENE2025 settings
      const { data, error: functionError } = await supabase.functions.invoke(
        "generate-workout-plan-llama",
        {
          body: { 
            preferences: safePreferences, 
            userId: user.id,
            settings: aiSettings || null,
            forceTrene2025: true // Forçar uso do agente TRENE2025
          },
        }
      );
      
      if (functionError) {
        console.error("Erro na função Edge:", functionError);
        throw new Error(`Erro ao gerar plano de treino: ${functionError.message}`);
      }
      
      if (!data || !data.workoutPlan) {
        throw new Error("Resposta inválida do gerador de plano de treino");
      }
      
      // Extract the complete plan data
      const planData = data.workoutPlan;
      console.log("Dados do plano de treino recebidos:", planData);
      
      // Get current date in Brasilia timezone
      const now = new Date();
      const nowBrasilia = formatInTimeZone(now, BRAZIL_TIMEZONE, "yyyy-MM-dd");
      
      // Calculate end date (current date + 7 days) in Brasilia timezone
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const endDateBrasilia = formatInTimeZone(endDate, BRAZIL_TIMEZONE, "yyyy-MM-dd");
      
      // First, save the main workout plan (without the sessions)
      const { data: savedPlan, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          goal: planData.goal,
          start_date: planData.start_date || nowBrasilia,
          end_date: planData.end_date || endDateBrasilia,
          // Removed workout_sessions as it's not a column in the table
        })
        .select()
        .single();
      
      if (planError) {
        console.error("Erro ao salvar plano de treino:", planError);
        throw new Error(`Erro ao salvar plano de treino: ${planError.message}`);
      }
      
      console.log("Plano de treino principal salvo:", savedPlan);
      
      // Then save each workout session as a separate record
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
            console.error("Erro ao salvar sessão de treino:", sessionError);
            continue; // Skip to the next session if there's an error
          }
          
          console.log("Sessão de treino salva:", savedSession);
          
          // Then save each exercise in the session
          if (session.session_exercises && Array.isArray(session.session_exercises)) {
            for (const exerciseItem of session.session_exercises) {
              // Check if we have a valid exercise object with ID
              if (!exerciseItem.exercise || !exerciseItem.exercise.id) {
                console.warn("Item de exercício inválido ou ID ausente:", exerciseItem);
                continue; // Skip to the next exercise if there's no valid ID
              }
              
              // Insert the session exercise
              const { error: exerciseError } = await supabase
                .from('session_exercises')
                .insert({
                  session_id: savedSession.id,
                  exercise_id: exerciseItem.exercise.id,
                  sets: exerciseItem.sets,
                  reps: exerciseItem.reps,
                  rest_time_seconds: exerciseItem.rest_time_seconds,
                  order_in_session: session.session_exercises.indexOf(exerciseItem),
                });
                
              if (exerciseError) {
                console.error("Erro ao salvar exercício:", exerciseError);
              }
            }
          }
        }
      }
      
      // Now fetch the complete workout plan with all its sessions and exercises
      // to make sure we have the most up-to-date data
      const { data: fetchedPlan, error: fetchError } = await supabase
        .from('workout_plans')
        .select(`
          id, user_id, goal, start_date, end_date,
          workout_sessions (
            id, day_number, warmup_description, cooldown_description,
            session_exercises (
              id, sets, reps, rest_time_seconds, order_in_session,
              exercise:exercise_id (
                id, name, description, gif_url, muscle_group, exercise_type
              )
            )
          )
        `)
        .eq('id', savedPlan.id)
        .single();
        
      if (fetchError) {
        console.error("Erro ao buscar plano de treino completo:", fetchError);
        // Still continue as we at least saved the basic plan
      }
      
      // Transform the fetched data to match our WorkoutPlan type
      if (fetchedPlan) {
        // Create a properly typed WorkoutPlan object
        const typedWorkoutPlan: WorkoutPlan = {
          id: fetchedPlan.id,
          user_id: fetchedPlan.user_id,
          goal: fetchedPlan.goal,
          start_date: fetchedPlan.start_date,
          end_date: fetchedPlan.end_date,
          workout_sessions: fetchedPlan.workout_sessions.map(session => ({
            id: session.id,
            day_number: session.day_number,
            warmup_description: session.warmup_description,
            cooldown_description: session.cooldown_description,
            session_exercises: session.session_exercises
              .filter(ex => ex.exercise !== null) // Filter out null exercises
              .map(ex => ({
                id: ex.id,
                sets: ex.sets,
                reps: ex.reps,
                rest_time_seconds: ex.rest_time_seconds,
                exercise: ex.exercise ? {
                  id: ex.exercise.id,
                  name: ex.exercise.name,
                  description: ex.exercise.description || '',
                  gif_url: ex.exercise.gif_url || '',
                  muscle_group: ex.exercise.muscle_group || '',
                  exercise_type: ex.exercise.exercise_type || ''
                } : null
              }))
              .filter(ex => ex.exercise !== null) // Double-check filter for null exercises
          }))
        };
        
        setWorkoutPlan(typedWorkoutPlan);
      } else {
        // Fallback: use the original data but add the saved plan ID
        const fallbackPlan: WorkoutPlan = {
          id: savedPlan.id,
          user_id: user.id,
          goal: planData.goal,
          start_date: savedPlan.start_date,
          end_date: savedPlan.end_date,
          workout_sessions: planData.workout_sessions
        };
        setWorkoutPlan(fallbackPlan);
      }
      
      // Update profile generation count - fixed approach to avoid type error
      // Instead of using rpc, we'll use a direct table update
      const { data: countData, error: countError } = await supabase
        .from('plan_generation_counts')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (countError && countError.code !== 'PGRST116') {
        console.error("Erro ao verificar contagem de geração de plano:", countError);
      }
      
      if (countData) {
        // Update existing record
        await supabase
          .from('plan_generation_counts')
          .update({ 
            workout_count: (countData.workout_count || 0) + 1,
            updated_at: formatInTimeZone(new Date(), BRAZIL_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
          })
          .eq('user_id', user.id);
      } else {
        // Insert new record
        await supabase
          .from('plan_generation_counts')
          .insert({
            user_id: user.id,
            workout_count: 1,
            nutrition_count: 0,
            rehabilitation_count: 0
          });
      }
      
      toast.success("Plano de treino gerado com sucesso pelo TRENE2025!");
    } catch (err: any) {
      console.error("Erro na geração do plano de treino:", err);
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
