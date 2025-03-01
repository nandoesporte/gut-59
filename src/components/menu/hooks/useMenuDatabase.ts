
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DietaryPreferences } from "../types";

export const mapGoalToDbValue = (goal: string | undefined): "maintain" | "lose_weight" | "gain_mass" => {
  if (!goal) return "maintain";
  
  switch (goal) {
    case "lose":
      return "lose_weight";
    case "gain":
      return "gain_mass";
    case "maintain":
      return "maintain";
    default:
      return "maintain";
  }
};

export const useMenuDatabase = () => {
  const saveCalorieCalculation = async (
    formData: {
      weight: string;
      height: string;
      age: string;
      gender: string;
      activityLevel: string;
      goal?: string;
    },
    calories: number,
    selectedFoods: string[]
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Usuário não autenticado");
        return false;
      }

      console.log("Salvando preferências para o usuário:", user.id);
      console.log("Dados do formulário:", formData);
      
      const activityLevel = formData.activityLevel as "sedentary" | "light" | "moderate" | "intense";
      const goal = mapGoalToDbValue(formData.goal);
      
      console.log("Mapeamento de objetivo:", formData.goal, "->", goal);
      
      const { data: existingRecord, error: selectError } = await supabase
        .from('nutrition_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (selectError) {
        console.error('Erro ao verificar preferências existentes:', selectError);
        return false;
      }
      
      if (existingRecord) {
        console.log("Atualizando registro existente:", existingRecord.id);
        const { error } = await supabase
          .from('nutrition_preferences')
          .update({
            weight: Number(formData.weight),
            height: Number(formData.height),
            age: Number(formData.age),
            gender: formData.gender,
            activity_level: activityLevel,
            goal: goal,
            calories_needed: calories,
            selected_foods: selectedFoods
          })
          .eq('id', existingRecord.id);
        
        if (error) {
          console.error('Erro ao atualizar preferências nutricionais:', error);
          return false;
        } else {
          console.log("Preferências atualizadas com sucesso");
          return true;
        }
      } else {
        console.log("Criando novo registro de preferências");
        const { error } = await supabase
          .from('nutrition_preferences')
          .insert({
            user_id: user.id,
            weight: Number(formData.weight),
            height: Number(formData.height),
            age: Number(formData.age),
            gender: formData.gender,
            activity_level: activityLevel,
            goal: goal,
            calories_needed: calories,
            selected_foods: selectedFoods
          });
        
        if (error) {
          console.error('Erro ao inserir preferências nutricionais:', error);
          return false;
        } else {
          console.log("Novas preferências criadas com sucesso");
          return true;
        }
      }
    } catch (error) {
      console.error('Erro ao salvar cálculo de calorias:', error);
      return false;
    }
  };

  const saveFoodSelection = async (selectedFoods: string[], formData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Usuário não autenticado");
        return false;
      }

      console.log("Confirmando seleção de alimentos para usuário:", user.id);
      console.log("Alimentos selecionados:", selectedFoods);

      const { data: recentPrefs, error: recentError } = await supabase
        .from('nutrition_preferences')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentError) {
        console.error('Erro ao buscar preferência mais recente:', recentError);
        console.log("Tentando criar um novo registro após erro na busca");
      }

      if (recentPrefs?.id) {
        console.log("Encontrado registro existente. Atualizando ID:", recentPrefs.id);
        const { error: updateError } = await supabase
          .from('nutrition_preferences')
          .update({ 
            selected_foods: selectedFoods
          })
          .eq('id', recentPrefs.id);

        if (updateError) {
          console.error('Erro ao atualizar preferências:', updateError);
          return false;
        } else {
          console.log("Preferências atualizadas com sucesso no registro existente");
          return true;
        }
      } else {
        console.log("Nenhum registro encontrado ou erro na busca. Criando novo...");
        const { data: anyExisting } = await supabase
          .from('nutrition_preferences')
          .select('count')
          .eq('user_id', user.id);
          
        const hasExisting = anyExisting && Array.isArray(anyExisting) && anyExisting.length > 0;
        
        if (hasExisting) {
          console.log("Já existem registros para este usuário. Tentando excluir registros antigos...");
          await supabase
            .from('nutrition_preferences')
            .delete()
            .eq('user_id', user.id);
            
          console.log("Registros antigos excluídos. Criando novo registro limpo.");
        }
        
        const { error: insertError } = await supabase
          .from('nutrition_preferences')
          .insert({
            user_id: user.id,
            selected_foods: selectedFoods,
            weight: Number(formData.weight) || 70,
            height: Number(formData.height) || 170,
            age: Number(formData.age) || 30,
            gender: formData.gender || 'male',
            activity_level: (formData.activityLevel as "sedentary" | "light" | "moderate" | "intense") || 'moderate',
            goal: mapGoalToDbValue(formData.goal) || 'maintain'
          });

        if (insertError) {
          console.error('Erro ao inserir preferências:', insertError);
          return false;
        } else {
          console.log("Novo registro de preferências criado com sucesso");
          return true;
        }
      }
    } catch (error) {
      console.error('Erro ao salvar preferências de alimentos:', error);
      return false;
    }
  };

  const saveDietaryPreferences = async (preferences: DietaryPreferences, userId: string) => {
    try {
      const sanitizedPreferences = {
        user_id: userId,
        has_allergies: Boolean(preferences.hasAllergies),
        allergies: Array.isArray(preferences.allergies) ? preferences.allergies.map(String) : [],
        dietary_restrictions: Array.isArray(preferences.dietaryRestrictions) ? preferences.dietaryRestrictions.map(String) : [],
        training_time: preferences.trainingTime || null
      };

      console.log('[MenuDatabase] Salvando preferências dietéticas:', JSON.stringify(sanitizedPreferences, null, 2));

      const { error: prefsError } = await supabase
        .from('dietary_preferences')
        .upsert(sanitizedPreferences, { onConflict: 'user_id' });
          
      if (prefsError) {
        console.error('[MenuDatabase] Erro ao salvar preferências dietéticas:', prefsError);
        console.error('[MenuDatabase] Erro completo:', JSON.stringify(prefsError, null, 2));
        return false;
      } else {
        console.log('[MenuDatabase] Preferências dietéticas salvas com sucesso');
        return true;
      }
    } catch (error) {
      console.error('[MenuDatabase] Erro ao salvar preferências dietéticas:', error);
      return false;
    }
  };

  const loadSavedFoodPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: nutritionPrefs, error } = await supabase
        .from('nutrition_preferences')
        .select('selected_foods')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar preferências alimentares:', error);
        return null;
      }

      return nutritionPrefs?.selected_foods || null;
    } catch (err) {
      console.error('Erro ao carregar preferências:', err);
      return null;
    }
  };

  const loadDietaryPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para gerar um plano alimentar");
        return null;
      }
      
      const { data: preferences } = await supabase
        .from('dietary_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (!preferences) {
        toast.error("Não foi possível encontrar suas preferências dietéticas");
        return null;
      }
      
      return preferences;
    } catch (error) {
      console.error("Erro ao carregar preferências dietéticas:", error);
      return null;
    }
  };

  const loadNutritionPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para gerar um plano alimentar");
        return null;
      }
      
      const { data: nutritionPrefs } = await supabase
        .from('nutrition_preferences')
        .select('selected_foods')
        .eq('user_id', user.id)
        .single();
        
      if (!nutritionPrefs || !nutritionPrefs.selected_foods) {
        toast.error("Não foi possível encontrar suas preferências alimentares");
        return null;
      }
      
      return nutritionPrefs;
    } catch (error) {
      console.error("Erro ao carregar preferências nutricionais:", error);
      return null;
    }
  };

  return {
    saveCalorieCalculation,
    saveFoodSelection,
    saveDietaryPreferences,
    loadSavedFoodPreferences,
    loadDietaryPreferences,
    loadNutritionPreferences
  };
};
