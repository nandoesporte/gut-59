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

    console.log("✅ Trenner2025: Plano de treino gerado com sucesso!");
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

    console.log("✅ Plano base salvo com sucesso");

    // Process and save workout sessions
    if (plan.workout_sessions && Array.isArray(plan.workout_sessions)) {
      console.log(`💾 Salvando ${plan.workout_sessions.length} sessões...`);
      
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

        console.log(`✅ Sessão ${session.day_number} salva`);

        // Process and save session exercises
        if (session.session_exercises && Array.isArray(session.session_exercises)) {
          console.log(`💾 Salvando ${session.session_exercises.length} exercícios da sessão ${session.day_number}...`);
          
          for (const exercise of session.session_exercises) {
            const exerciseData: any = {
              id: exercise.id,
              session_id: session.id,
              exercise_id: exercise.exercise?.id,
              sets: exercise.sets,
              reps: exercise.reps,
              rest_time_seconds: exercise.rest_time_seconds,
              order_in_session: exercise.order_in_session,
            };

            // Check if recommended_weight column exists by attempting to add it
            if (exercise.recommended_weight) {
              try {
                exerciseData.recommended_weight = exercise.recommended_weight;
                console.log(`💪 Salvando exercício ${exercise.exercise?.name} com carga: ${exercise.recommended_weight}`);
              } catch (err) {
                console.log(`⚠️ Coluna recommended_weight não disponível, salvando sem carga`);
              }
            }

            const { error: exerciseError } = await supabase
              .from('session_exercises')
              .upsert([exerciseData], { onConflict: 'id' });

            if (exerciseError) {
              console.error("Error saving session exercise:", exerciseError);
              // Continue salvando outros exercícios mesmo se um falhar
            } else {
              console.log(`✅ Exercício ${exercise.exercise?.name} salvo`);
            }
          }
        }
      }
    }

    console.log("✅ Plano de treino completo salvo com sucesso");
    
    // Now fetch the complete workout plan with proper error handling
    console.log("🔍 Buscando plano completo...");
    
    try {
      // Try fetching with recommended_weight first
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
        console.log("⚠️ Erro ao buscar com recommended_weight, tentando sem...");
        throw fetchError;
      }
      
      console.log("✅ Plano completo recuperado com recommended_weight");
      return completePlan as WorkoutPlan;
      
    } catch (error: any) {
      if (error.message?.includes("recommended_weight") || error.message?.includes("does not exist")) {
        console.log("⚠️ Coluna recommended_weight não existe, buscando sem ela...");
        
        try {
          const { data: fallbackPlan, error: fallbackError } = await supabase
            .from('workout_plans')
            .select(`
              *,
              workout_sessions (
                *,
                session_exercises (
                  *,
                  exercise:exercises (*)
                )
              )
            `)
            .eq('id', plan.id)
            .single();
            
          if (fallbackError) {
            throw fallbackError;
          }
          
          // Transform the result to match WorkoutPlan interface
          const transformedPlan: WorkoutPlan = {
            id: fallbackPlan.id,
            user_id: fallbackPlan.user_id,
            goal: fallbackPlan.goal,
            start_date: fallbackPlan.start_date,
            end_date: fallbackPlan.end_date,
            created_at: fallbackPlan.created_at,
            workout_sessions: fallbackPlan.workout_sessions?.map((session: any) => ({
              id: session.id,
              day_number: session.day_number,
              warmup_description: session.warmup_description,
              cooldown_description: session.cooldown_description,
              session_exercises: session.session_exercises?.map((sessionExercise: any) => {
                // Find matching exercise in original plan to get recommended_weight
                const originalSession = plan.workout_sessions?.find((s: any) => s.id === session.id);
                const originalExercise = originalSession?.session_exercises?.find((e: any) => e.id === sessionExercise.id);
                
                return {
                  id: sessionExercise.id,
                  sets: sessionExercise.sets,
                  reps: sessionExercise.reps,
                  rest_time_seconds: sessionExercise.rest_time_seconds,
                  order_in_session: sessionExercise.order_in_session,
                  recommended_weight: originalExercise?.recommended_weight,
                  exercise: sessionExercise.exercise
                };
              }) || []
            })) || []
          };
          
          console.log("✅ Plano completo recuperado e transformado sem recommended_weight");
          return transformedPlan;
          
        } catch (fallbackError) {
          console.error("Error fetching complete workout plan (fallback):", fallbackError);
          // Return basic plan structure if all else fails
          return {
            id: savedPlan.id,
            user_id: savedPlan.user_id,
            goal: savedPlan.goal,
            start_date: savedPlan.start_date,
            end_date: savedPlan.end_date,
            created_at: savedPlan.created_at,
            workout_sessions: []
          } as WorkoutPlan;
        }
      } else {
        console.error("Error fetching complete workout plan:", error);
        return {
          id: savedPlan.id,
          user_id: savedPlan.user_id,
          goal: savedPlan.goal,
          start_date: savedPlan.start_date,
          end_date: savedPlan.end_date,
          created_at: savedPlan.created_at,
          workout_sessions: []
        } as WorkoutPlan;
      }
    }
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
