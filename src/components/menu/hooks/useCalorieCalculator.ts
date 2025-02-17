
import { useState } from "react";
import type { CalorieCalculatorForm } from "../CalorieCalculator";

// Fatores de atividade física baseados no nível
const ACTIVITY_FACTORS = {
  sedentary: 1.2,      // Pouca ou nenhuma atividade
  light: 1.375,        // Exercício leve 1-3x por semana
  moderate: 1.55,      // Exercício moderado 3-5x por semana
  intense: 1.725       // Exercício intenso 6-7x por semana
};

// Ajustes calóricos baseados no objetivo
const GOAL_ADJUSTMENTS = {
  lose_weight: -500,   // Déficit calórico para perda de peso
  maintain: 0,         // Manutenção do peso atual
  gain_mass: 500       // Superávit calórico para ganho de massa
};

// Ajustes percentuais para condições de saúde
const HEALTH_CONDITION_FACTORS = {
  diabetes: 0.95,      // Redução de 5% para diabéticos
  hypertension: 0.90,  // Redução de 10% para hipertensos
  depression_anxiety: 1 // Sem ajuste específico
};

export const useCalorieCalculator = (onCalculateComplete: (calories: number) => void) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CalorieCalculatorForm>({
    weight: 0,
    height: 0,
    age: 0,
    gender: "male",
    activityLevel: "moderatelyActive",
    goal: "maintain",
    healthCondition: null
  });

  const calculateMifflinStJeor = () => {
    // Fórmula de Mifflin-St Jeor para TMB
    const baseCalories = (10 * formData.weight) + 
                        (6.25 * formData.height) - 
                        (5 * formData.age);
    
    // Ajuste baseado no sexo
    return formData.gender === "male" ? baseCalories + 5 : baseCalories - 161;
  };

  const calculateMacroDistribution = (totalCalories: number) => {
    // Distribuição padrão de macronutrientes
    const proteinCalories = totalCalories * 0.25; // 25% proteína
    const carbCalories = totalCalories * 0.45;    // 45% carboidratos
    const fatCalories = totalCalories * 0.30;     // 30% gorduras

    return {
      protein: Math.round(proteinCalories / 4),  // 4 calorias por grama
      carbs: Math.round(carbCalories / 4),       // 4 calorias por grama
      fats: Math.round(fatCalories / 9),         // 9 calorias por grama
    };
  };

  const handleCalculateCalories = async () => {
    try {
      setLoading(true);

      // 1. Calcular TMB usando Mifflin-St Jeor
      let calories = calculateMifflinStJeor();

      // 2. Aplicar fator de atividade física
      calories *= ACTIVITY_FACTORS[formData.activityLevel as keyof typeof ACTIVITY_FACTORS] || 1;

      // 3. Ajustar baseado no objetivo
      calories += GOAL_ADJUSTMENTS[formData.goal as keyof typeof GOAL_ADJUSTMENTS] || 0;

      // 4. Ajustar para condições de saúde
      if (formData.healthCondition) {
        calories *= HEALTH_CONDITION_FACTORS[formData.healthCondition as keyof typeof HEALTH_CONDITION_FACTORS] || 1;
      }

      // 5. Distribuir calorias por refeição
      const mealDistribution = {
        breakfast: Math.round(calories * 0.20),     // 20% café da manhã
        morningSnack: Math.round(calories * 0.10),  // 10% lanche da manhã
        lunch: Math.round(calories * 0.30),         // 30% almoço
        afternoonSnack: Math.round(calories * 0.10),// 10% lanche da tarde
        dinner: Math.round(calories * 0.30)         // 30% jantar
      };

      // 6. Calcular macronutrientes
      const macros = calculateMacroDistribution(calories);

      // 7. Arredondar o total de calorias
      const finalCalories = Math.round(calories);

      console.log('Cálculo detalhado:', {
        baseTMB: calculateMifflinStJeor(),
        adjustedCalories: calories,
        mealDistribution,
        macros
      });

      onCalculateComplete(finalCalories);
    } catch (error) {
      console.error("Erro ao calcular calorias:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    setFormData,
    loading,
    handleCalculateCalories
  };
};
