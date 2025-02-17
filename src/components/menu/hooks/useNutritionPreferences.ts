
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { NutritionPreferences } from "../types";

export const useNutritionPreferences = () => {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NutritionPreferences | null>(null);

  const savePreferences = async (data: NutritionPreferences) => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast.error("Usuário não autenticado");
        return false;
      }

      // Convert from frontend model to database model
      const dbData = {
        user_id: userData.user.id,
        weight: data.weight,
        height: data.height,
        age: data.age,
        gender: data.gender,
        activity_level: data.activityLevel,
        goal: data.goal,
        health_condition: data.healthCondition,
        dietary_preferences: data.dietaryPreferences,
        allergies: data.allergies,
      };

      const { error } = await supabase
        .from('nutrition_preferences')
        .upsert(dbData);

      if (error) throw error;

      setPreferences(data);
      toast.success("Preferências salvas com sucesso!");
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error("Erro ao salvar preferências");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data, error } = await supabase
        .from('nutrition_preferences')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Convert from database model to frontend model
        setPreferences({
          weight: data.weight,
          height: data.height,
          age: data.age,
          gender: data.gender as 'male' | 'female',
          activityLevel: data.activity_level,
          goal: data.goal,
          healthCondition: data.health_condition,
          dietaryPreferences: data.dietary_preferences || [],
          allergies: data.allergies || []
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error("Erro ao carregar preferências");
    } finally {
      setLoading(false);
    }
  };

  return {
    preferences,
    loading,
    savePreferences,
    loadPreferences
  };
};
