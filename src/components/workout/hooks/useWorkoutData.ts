
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FormSchema, mapTrainingLocationToEquipment } from "../utils/form-utils";
import { WorkoutPreferences } from "../types";

export const useWorkoutData = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);

  // Initialize user data
  const initializeUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Erro ao obter usuário:', error);
      return null;
    }
  };

  // Save partial data during form edits (auto-save)
  const savePartialData = async (data: FormSchema) => {
    // Skip if not authenticated
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      // Convert training location to available equipment format
      const availableEquipment = mapTrainingLocationToEquipment(data.training_location);

      console.log('Salvando parcialmente para usuário:', user.id);

      const preferenceData = {
        user_id: user.id,
        age: data.age,
        weight: data.weight,
        height: data.height,
        gender: data.gender,
        goal: data.goal,
        activity_level: data.activity_level,
        preferred_exercise_types: data.preferred_exercise_types,
        available_equipment: availableEquipment,
        health_conditions: [],
      };

      // Use update instead of upsert to avoid unique constraint errors
      const { data: existingPrefs } = await supabase
        .from('user_workout_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      
      if (existingPrefs) {
        // Update existing preferences
        const { error: updateError } = await supabase
          .from('user_workout_preferences')
          .update(preferenceData)
          .eq('user_id', user.id);
          
        error = updateError;
      } else {
        // Insert new preferences
        const { error: insertError } = await supabase
          .from('user_workout_preferences')
          .insert(preferenceData);
          
        error = insertError;
      }

      if (error) {
        console.error('Erro ao auto-salvar preferências:', error);
        // Don't show toast for auto-save errors to avoid annoying users
      } else {
        console.log('Preferências auto-salvas com sucesso');
      }
    } catch (error) {
      console.error('Erro ao auto-salvar preferências:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Save final user preferences on submit
  const saveUserPreferences = async (data: FormSchema): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      console.log('Salvando preferências para usuário:', user.id);
      console.log('Dados a serem salvos:', data);

      const availableEquipment = mapTrainingLocationToEquipment(data.training_location);

      console.log('Equipamentos mapeados:', availableEquipment);

      const preferenceData = {
        user_id: user.id,
        age: data.age,
        weight: data.weight,
        height: data.height,
        gender: data.gender,
        goal: data.goal,
        activity_level: data.activity_level,
        preferred_exercise_types: data.preferred_exercise_types,
        available_equipment: availableEquipment,
        health_conditions: [],
      };

      console.log('Objeto completo para salvar:', preferenceData);

      // Check if record already exists
      const { data: existingPrefs, error: checkError } = await supabase
        .from('user_workout_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (checkError) {
        console.error('Erro ao verificar preferências existentes:', checkError);
        toast.error("Erro ao verificar preferências existentes");
        throw new Error(checkError.message);
      }
      
      let savedData;
      let error;
      
      if (existingPrefs) {
        // Update existing preferences
        const { data: updateData, error: updateError } = await supabase
          .from('user_workout_preferences')
          .update(preferenceData)
          .eq('user_id', user.id)
          .select();
          
        savedData = updateData;
        error = updateError;
      } else {
        // Insert new preferences
        const { data: insertData, error: insertError } = await supabase
          .from('user_workout_preferences')
          .insert(preferenceData)
          .select();
          
        savedData = insertData;
        error = insertError;
      }

      if (error) {
        console.error('Erro ao salvar preferências:', error);
        toast.error("Erro ao salvar suas preferências");
        throw new Error(error.message);
      } else {
        console.log('Preferências salvas com sucesso:', savedData);
        toast.success("Preferências salvas com sucesso");
      }
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      toast.error("Erro ao salvar suas preferências");
      throw error;
    }
  };

  return {
    isSaving,
    setIsSaving,
    user,
    initializeUser,
    savePartialData,
    saveUserPreferences
  };
};
