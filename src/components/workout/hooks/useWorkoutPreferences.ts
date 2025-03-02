
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UseFormReturn } from "react-hook-form";
import { FormSchema, isValidGender, isValidGoal, isValidActivityLevel, isValidExerciseType, mapEquipmentToTrainingLocation } from "../utils/form-utils";
import { ExerciseType } from "../types";

export const useWorkoutPreferences = (form: UseFormReturn<FormSchema>) => {
  const [isLoading, setIsLoading] = useState(false);

  // Load user preferences from the database
  const loadUserPreferences = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log('Buscando preferências para usuário:', user.id);

      const { data, error } = await supabase
        .from('user_workout_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar preferências:', error);
        return;
      }

      if (data) {
        console.log('Preferências encontradas:', data);
        
        // Validate and cast the data to ensure it matches the expected enums
        const gender = isValidGender(data.gender) ? data.gender : "male";
        const goal = isValidGoal(data.goal) ? data.goal : "maintain";
        const activity_level = isValidActivityLevel(data.activity_level) ? data.activity_level : "moderate";
        
        // Validate preferred exercise types
        const preferred_exercise_types = Array.isArray(data.preferred_exercise_types) 
          ? data.preferred_exercise_types.filter(isValidExerciseType)
          : ["strength"];
        
        // If no valid types remain after filtering, use the default
        const finalExerciseTypes = preferred_exercise_types.length > 0 
          ? preferred_exercise_types 
          : ["strength"];

        form.reset({
          age: data.age,
          weight: data.weight,
          height: data.height,
          gender: gender,
          goal: goal,
          activity_level: activity_level,
          preferred_exercise_types: finalExerciseTypes as ExerciseType[],
          training_location: mapEquipmentToTrainingLocation(data.available_equipment)
        });
      } else {
        console.log('Nenhuma preferência encontrada para este usuário');
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    loadUserPreferences
  };
};
