
import { useState } from "react";
import type { CalorieCalculatorForm } from "../CalorieCalculator";
import { activityLevels } from "../CalorieCalculator";

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

  const calculateBMR = () => {
    // Fórmula de Harris-Benedict
    if (formData.gender === "male") {
      return 88.362 + (13.397 * formData.weight) + (4.799 * formData.height) - (5.677 * formData.age);
    } else {
      return 447.593 + (9.247 * formData.weight) + (3.098 * formData.height) - (4.330 * formData.age);
    }
  };

  const handleCalculateCalories = async () => {
    try {
      setLoading(true);

      // Calcular BMR
      const bmr = calculateBMR();

      // Aplicar fator de atividade
      const activityFactor = activityLevels[formData.activityLevel]?.factor || 1;
      let totalCalories = bmr * activityFactor;

      // Ajustar baseado no objetivo
      switch (formData.goal) {
        case "lose_weight":
          totalCalories *= 0.8; // Déficit de 20%
          break;
        case "gain_mass":
          totalCalories *= 1.2; // Superávit de 20%
          break;
        default:
          // Manter peso, não precisa ajustar
          break;
      }

      // Ajustes baseados em condições de saúde
      if (formData.healthCondition === "diabetes") {
        totalCalories *= 0.95; // Redução de 5% para diabéticos
      } else if (formData.healthCondition === "hypertension") {
        totalCalories *= 0.9; // Redução de 10% para hipertensos
      }

      // Arredondar para o número inteiro mais próximo
      const finalCalories = Math.round(totalCalories);

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
