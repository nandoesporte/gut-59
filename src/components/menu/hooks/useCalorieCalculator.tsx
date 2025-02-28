
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { CalorieCalculatorForm } from "../CalorieCalculator";

type NutritionPreference = Database['public']['Tables']['nutrition_preferences']['Insert'];

const mapGoalToEnum = (goal: string): Database['public']['Enums']['nutritional_goal'] => {
  const goalMap: Record<string, Database['public']['Enums']['nutritional_goal']> = {
    'lose': 'lose_weight',
    'gain': 'gain_mass',
    'maintain': 'maintain'
  };
  return goalMap[goal] || 'maintain';
};

export const useCalorieCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);

  /**
   * Calcula a Taxa Metabólica Basal (TMB) usando a equação de Harris-Benedict
   * @param data Dados do formulário
   * @returns Taxa Metabólica Basal em calorias
   */
  const calculateBMR = (data: CalorieCalculatorForm): number => {
    const weight = parseFloat(data.weight);
    const height = parseFloat(data.height);
    const age = parseFloat(data.age);

    if (data.gender === "male") {
      // Fórmula para homens: TMB = 88.36 + (13.4 × peso) + (4.8 × altura) - (5.7 × idade)
      return 88.36 + (13.4 * weight) + (4.8 * height) - (5.7 * age);
    } else {
      // Fórmula para mulheres: TMB = 447.6 + (9.2 × peso) + (3.1 × altura) - (4.3 × idade)
      return 447.6 + (9.2 * weight) + (3.1 * height) - (4.3 * age);
    }
  };

  /**
   * Obtém o fator de atividade baseado no nível de atividade
   * @param activityLevel Nível de atividade física
   * @returns Fator de multiplicação para o cálculo do GET
   */
  const getActivityFactor = (activityLevel: string): number => {
    switch (activityLevel) {
      case "sedentary":
        return 1.2;   // Sedentário: pouca ou nenhuma atividade física
      case "light":
        return 1.375; // Atividade leve: exercícios leves 1-3 dias/semana
      case "moderate":
        return 1.55;  // Atividade moderada: exercícios moderados 3-5 dias/semana
      case "intense":
        return 1.725; // Atividade intensa: exercícios intensos 6-7 dias/semana
      case "athlete":
        return 1.9;   // Atleta: exercícios muito intensos, trabalho físico
      default:
        return 1.2;   // Padrão: sedentário
    }
  };

  /**
   * Ajusta as calorias com base no objetivo do usuário
   * @param calories Gasto Energético Total (GET)
   * @param goal Objetivo (perda, manutenção ou ganho)
   * @returns Calorias ajustadas conforme o objetivo
   */
  const adjustCaloriesForGoal = (calories: number, goal: string | undefined): number => {
    if (!goal) return calories;

    switch (goal) {
      case "lose":
        // Perda de peso: redução de 15% 
        return Math.round(calories * 0.85);
      case "gain":
        // Ganho de massa: aumento de 15%
        return Math.round(calories * 1.15);
      case "maintain":
      default:
        // Manutenção: sem ajuste
        return Math.round(calories);
    }
  };

  const calculateCalories = async (formData: CalorieCalculatorForm, selectedLevel: { value: string }) => {
    try {
      setLoading(true);
      
      // Calcular a Taxa Metabólica Basal (TMB)
      const bmr = calculateBMR(formData);
      console.log(`TMB calculada: ${bmr.toFixed(2)} calorias`);
      
      // Obter o fator de atividade
      const activityFactor = getActivityFactor(selectedLevel.value);
      console.log(`Fator de atividade (${selectedLevel.value}): ${activityFactor}`);
      
      // Calcular o Gasto Energético Total (GET)
      const totalEnergyExpenditure = bmr * activityFactor;
      console.log(`GET (antes do ajuste): ${totalEnergyExpenditure.toFixed(2)} calorias`);
      
      // Ajustar calorias com base no objetivo
      const adjustedCalories = adjustCaloriesForGoal(totalEnergyExpenditure, formData.goal);
      console.log(`Calorias ajustadas para objetivo (${formData.goal}): ${adjustedCalories} calorias`);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return null;
      }

      if (!formData.goal) {
        toast.error("Por favor, selecione um objetivo");
        return null;
      }

      const nutritionPreference: NutritionPreference = {
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        age: parseFloat(formData.age),
        gender: formData.gender,
        activity_level: formData.activityLevel as Database['public']['Enums']['activity_level'],
        goal: mapGoalToEnum(formData.goal),
        user_id: user.id
      };

      const { error: nutritionError } = await supabase
        .from('nutrition_preferences')
        .upsert(nutritionPreference);

      if (nutritionError) {
        console.error('Error saving nutrition preferences:', nutritionError);
        throw nutritionError;
      }

      setCalorieNeeds(adjustedCalories);
      return adjustedCalories;
    } catch (error) {
      console.error('Error calculating calories:', error);
      toast.error("Erro ao calcular necessidades calóricas");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    calorieNeeds,
    calculateCalories,
  };
};
