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
    console.log("🏃‍♂️ Trenner2025 Agent: Iniciando geração do plano de treino...");
    console.log("📋 Preferências recebidas:", JSON.stringify(preferences, null, 2));
    
    // Determine days per week based on activity level with better logic
    let daysPerWeek = 3;
    switch (preferences.activity_level) {
      case "sedentary": 
        daysPerWeek = 2; 
        break;
      case "light": 
        daysPerWeek = 3; 
        break;
      case "moderate": 
        daysPerWeek = 4; 
        break;
      case "intense": 
        daysPerWeek = 5; 
        break;
      default:
        daysPerWeek = 3;
    }
    
    console.log(`🎯 Trenner2025: Nível de atividade ${preferences.activity_level} → ${daysPerWeek} dias por semana`);

    // Generate a unique request ID if not provided
    const reqId = requestId || `trenner2025_${userId}_${Date.now()}`;
    console.log(`🔑 Trenner2025: Request ID: ${reqId}`);

    // Get available exercises from database - ONLY valid exercises with batch GIFs
    console.log("📚 Trenner2025: Carregando exercícios válidos da pasta batch...");
    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("*")
      .like('gif_url', '%/storage/v1/object/public/exercise-gifs/batch/%')
      .limit(500);

    if (exercisesError) {
      console.error("❌ Trenner2025: Erro ao buscar exercícios da pasta batch:", exercisesError);
      throw new Error(`Erro ao buscar exercícios da pasta batch: ${exercisesError.message}`);
    }

    console.log(`✅ Trenner2025: ${exercises.length} exercícios carregados da pasta batch`);

    if (exercises.length === 0) {
      throw new Error("Nenhum exercício disponível na pasta batch do storage");
    }

    // Validação extra: filtrar apenas exercícios que realmente têm GIFs válidos
    const validExercises = exercises.filter(ex => 
      ex.gif_url && 
      ex.gif_url.includes('/storage/v1/object/public/exercise-gifs/batch/') &&
      ex.gif_url.trim().length > 50 && // URL deve ter tamanho mínimo
      !ex.gif_url.includes('placeholder') &&
      !ex.gif_url.includes('example') &&
      !ex.gif_url.includes('null') &&
      !ex.gif_url.includes('undefined')
    );

    console.log(`🎯 Trenner2025: ${validExercises.length} exercícios validados com GIFs funcionais`);

    if (validExercises.length === 0) {
      throw new Error("Nenhum exercício com GIFs válidos encontrado na pasta batch");
    }

    // Filter exercises based on user preferences
    console.log("🔍 Trenner2025: Filtrando exercícios baseado nas preferências...");
    let filteredExercises = validExercises;
    
    if (preferences.preferred_exercise_types && preferences.preferred_exercise_types.length > 0) {
      if (!preferences.preferred_exercise_types.includes("all" as any)) {
        filteredExercises = validExercises.filter(ex => 
          preferences.preferred_exercise_types.includes(ex.exercise_type)
        );
      }
    }

    // Se filtro muito restritivo, usar todos os exercícios válidos
    if (filteredExercises.length < 20) {
      console.log("⚠️ Filtro muito restritivo, usando todos os exercícios válidos");
      filteredExercises = validExercises;
    }

    console.log(`🎯 Trenner2025: ${filteredExercises.length} exercícios após filtro de preferências`);

    // Call edge function for workout plan generation
    console.log(`🚀 Trenner2025: Invocando edge function generate-workout-plan...`);
    const startTime = Date.now();
    
    const { data: workoutPlan, error } = await supabase.functions.invoke('generate-workout-plan', {
      body: {
        preferences: {
          ...preferences,
          days_per_week: daysPerWeek
        },
        userId,
        requestId: reqId,
        agentName: "Trenner2025"
      }
    });
    
    const endTime = Date.now();
    console.log(`⏱️ Trenner2025: Edge function executada em ${((endTime - startTime) / 1000).toFixed(2)} segundos`);

    if (error) {
      console.error("❌ Trenner2025: Erro no edge function:", error);
      throw new Error(`Erro ao gerar plano de treino: ${error.message}`);
    }

    if (!workoutPlan) {
      console.error("❌ Trenner2025: Nenhum plano retornado");
      throw new Error("Nenhum plano de treino foi gerado");
    }

    console.log("✅ Trenner2025: Plano de treino gerado com sucesso usando exercícios válidos da pasta batch!");
    console.log(`📊 Trenner2025: Plano contém ${workoutPlan.workout_sessions?.length || 0} sessões`);
    
    // Log detalhes de cada sessão incluindo cargas e validação de GIFs
    if (workoutPlan.workout_sessions) {
      workoutPlan.workout_sessions.forEach((session: any, index: number) => {
        console.log(`📅 Sessão ${index + 1}: ${session.session_exercises?.length || 0} exercícios`);
        if (session.session_exercises) {
          session.session_exercises.forEach((exercise: any, exIndex: number) => {
            console.log(`  💪 Exercício ${exIndex + 1}: ${exercise.exercise?.name} - Carga: ${exercise.recommended_weight || 'não especificada'} - GIF: ${exercise.exercise?.gif_url ? 'válido' : 'PROBLEMA!'}`);
            
            // Validação adicional no cliente
            if (!exercise.exercise?.gif_url || !exercise.exercise.gif_url.includes('/storage/v1/object/public/exercise-gifs/batch/')) {
              console.error(`❌ ERRO: Exercício sem GIF válido: ${exercise.exercise?.name}`);
            }
          });
        }
      });
    }

    return {
      workoutPlan,
      rawResponse: workoutPlan
    };
  } catch (error) {
    console.error("💥 Trenner2025: Erro durante geração:", error);
    return {
      error: error instanceof Error ? error.message : "Erro desconhecido no Trenner2025",
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

    console.log("💾 Salvando plano com cargas recomendadas...");

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
          warmup_description: session.warmup_description,
          cooldown_description: session.cooldown_description,
        };

        const { error: sessionError } = await supabase
          .from('workout_sessions')
          .upsert([sessionData], { onConflict: 'id' });

        if (sessionError) {
          console.error("Error saving workout session:", sessionError);
          continue;
        }

        // Process and save session exercises COM recommended_weight
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
              // AGORA salvamos a carga recomendada no banco
              recommended_weight: exercise.recommended_weight
            };

            console.log(`💪 Salvando exercício ${exercise.exercise?.name} com carga: ${exercise.recommended_weight}`);

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

    console.log("✅ Plano de treino e cargas salvos com sucesso");
    
    // Now fetch the complete workout plan with all sessions and exercises
    const { data: completePlan, error: fetchError } = await supabase
      .from('workout_plans')
      .select(`
        *,
        workout_sessions (
          *,
          session_exercises (
            *,
            recommended_weight,
            exercise:exercises (*)
          )
        )
      `)
      .eq('id', plan.id)
      .single();
      
    if (fetchError) {
      console.error("Error fetching complete workout plan:", fetchError);
      return {
        ...savedPlan,
        workout_sessions: []
      } as WorkoutPlan;
    }
    
    console.log("✅ Plano completo recuperado com cargas preservadas");
    return completePlan as WorkoutPlan;
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
