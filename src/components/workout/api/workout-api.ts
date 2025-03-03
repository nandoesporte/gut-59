
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPreferences } from "../types";
import { WorkoutPlan } from "../types/workout-plan";
import { toast } from "sonner";
import { getCurrentDateBrasilia, getEndDateBrasilia } from "../utils/date-utils";

// Get AI model settings
export const getAIModelSettings = async () => {
  const { data: aiSettings, error: settingsError } = await supabase
    .from('ai_model_settings')
    .select('*')
    .eq('name', 'trene2025')
    .single();
  
  if (settingsError) {
    console.warn("Configurações do modelo de IA não encontradas. Usando padrões:", settingsError);
  }
  
  checkGroqApiKey(aiSettings);
  
  return aiSettings;
};

// Check if Groq API key is configured
const checkGroqApiKey = (aiSettings: any) => {
  if (aiSettings && (!aiSettings.groq_api_key || aiSettings.groq_api_key.trim() === '')) {
    console.warn("Chave API Groq não configurada, necessária para os modelos Llama 3 e Groq");
    toast.warning("Chave API Groq não configurada. Contate o administrador para poder gerar planos de treino.");
  }
};

// Ensure preferences arrays are defined
export const sanitizePreferences = (preferences: WorkoutPreferences) => {
  return {
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
};

// Generate workout plan via edge function
export const generatePlanViaEdgeFunction = async (
  safePreferences: WorkoutPreferences, 
  userId: string, 
  aiSettings: any, 
  forceTrene2025: boolean = false,
  forceGroqApi: boolean = true // Always force Groq API by default
) => {
  console.log("Chamando função Edge com preferências:", safePreferences);
  console.log("Usando agente obrigatório: TRENE2025");
  
  // Verificar se temos a chave da API Groq
  if (forceGroqApi && (!aiSettings || !aiSettings.groq_api_key || aiSettings.groq_api_key.trim() === '')) {
    throw new Error("Chave API Groq não configurada. Impossível gerar plano sem essa chave.");
  }
  
  const { data, error: functionError } = await supabase.functions.invoke(
    "generate-workout-plan-llama",
    {
      body: { 
        preferences: safePreferences, 
        userId: userId,
        settings: aiSettings || null,
        forceTrene2025: true, // Forçar uso do agente TRENE2025
        forceGroqApi: forceGroqApi // Forçar o uso da API Groq
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
  
  return data.workoutPlan;
};

// Save main workout plan
export const savePlanToDatabase = async (planData: any, userId: string) => {
  const { data: savedPlan, error: planError } = await supabase
    .from('workout_plans')
    .insert({
      user_id: userId,
      goal: planData.goal,
      start_date: planData.start_date || getCurrentDateBrasilia(),
      end_date: planData.end_date || getEndDateBrasilia(),
    })
    .select()
    .single();
  
  if (planError) {
    console.error("Erro ao salvar plano de treino:", planError);
    throw new Error(`Erro ao salvar plano de treino: ${planError.message}`);
  }
  
  console.log("Plano de treino principal salvo:", savedPlan);
  return savedPlan;
};

// Save workout sessions
export const saveWorkoutSessions = async (planData: any, savedPlan: any) => {
  if (!planData.workout_sessions || !Array.isArray(planData.workout_sessions)) {
    return;
  }
  
  for (const session of planData.workout_sessions) {
    await saveSessionAndExercises(session, savedPlan.id);
  }
};

// Save a session and its exercises
const saveSessionAndExercises = async (session: any, planId: string) => {
  // Insert the session
  const { data: savedSession, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      plan_id: planId,
      day_number: session.day_number,
      warmup_description: session.warmup_description,
      cooldown_description: session.cooldown_description,
    })
    .select()
    .single();
  
  if (sessionError) {
    console.error("Erro ao salvar sessão de treino:", sessionError);
    return; // Skip to the next session if there's an error
  }
  
  console.log("Sessão de treino salva:", savedSession);
  
  // Save exercises for this session
  await saveSessionExercises(session, savedSession);
};

// Save exercises for a session
const saveSessionExercises = async (session: any, savedSession: any) => {
  if (!session.session_exercises || !Array.isArray(session.session_exercises)) {
    return;
  }
  
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
};

// Fetch complete workout plan with sessions and exercises
export const fetchCompletePlan = async (planId: string): Promise<WorkoutPlan | null> => {
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
    .eq('id', planId)
    .single();
    
  if (fetchError) {
    console.error("Erro ao buscar plano de treino completo:", fetchError);
    return null;
  }
  
  return transformToWorkoutPlan(fetchedPlan);
};

// Transform fetched data to match WorkoutPlan type
const transformToWorkoutPlan = (fetchedPlan: any): WorkoutPlan => {
  return {
    id: fetchedPlan.id,
    user_id: fetchedPlan.user_id,
    goal: fetchedPlan.goal,
    start_date: fetchedPlan.start_date,
    end_date: fetchedPlan.end_date,
    workout_sessions: fetchedPlan.workout_sessions.map((session: any) => ({
      id: session.id,
      day_number: session.day_number,
      warmup_description: session.warmup_description,
      cooldown_description: session.cooldown_description,
      session_exercises: session.session_exercises
        .filter((ex: any) => ex.exercise !== null)
        .map((ex: any) => ({
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
        .filter((ex: any) => ex.exercise !== null)
    }))
  };
};

// Update generation count
export const updatePlanGenerationCount = async (userId: string) => {
  const { data: countData, error: countError } = await supabase
    .from('plan_generation_counts')
    .select('*')
    .eq('user_id', userId)
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
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  } else {
    // Insert new record
    await supabase
      .from('plan_generation_counts')
      .insert({
        user_id: userId,
        workout_count: 1,
        nutrition_count: 0,
        rehabilitation_count: 0
      });
  }
};
