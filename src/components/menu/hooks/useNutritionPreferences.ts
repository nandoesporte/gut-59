
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

      const { error } = await supabase
        .from('nutrition_preferences')
        .upsert({
          user_id: userData.user.id,
          ...data,
          updated_at: new Date().toISOString()
        });

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
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found - this is fine for new users
          return;
        }
        throw error;
      }

      if (data) {
        setPreferences({
          weight: data.weight,
          height: data.height,
          age: data.age,
          gender: data.gender,
          activityLevel: data.activity_level,
          goal: data.goal,
          healthCondition: data.health_condition,
          dietaryPreferences: data.dietary_preferences,
          allergies: data.allergies
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
