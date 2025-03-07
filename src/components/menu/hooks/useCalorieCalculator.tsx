
import { useState } from "react";
import { toast } from "sonner";

export interface CalorieCalculatorForm {
  age: string;
  weight: string;
  height: string;
  gender: "male" | "female";
  activityLevel: string;
  goal: string;
}

export const useCalorieCalculator = () => {
  const [formData, setFormData] = useState<CalorieCalculatorForm>({
    age: "",
    weight: "",
    height: "",
    gender: "male",
    activityLevel: "moderate",
    goal: "maintenance"
  });
  
  const [calorieNeeds, setCalorieNeeds] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleCalculateCalories = async () => {
    setLoading(true);
    try {
      // Validate form data
      if (!formData.age || !formData.weight || !formData.height) {
        toast.error("Por favor, preencha todos os campos");
        return;
      }

      // Get the activity level multiplier
      const activityLevels = {
        sedentary: { multiplier: 1.2 },
        light: { multiplier: 1.375 },
        moderate: { multiplier: 1.55 },
        active: { multiplier: 1.725 },
        very_active: { multiplier: 1.9 }
      };
      
      const selectedLevel = activityLevels[formData.activityLevel as keyof typeof activityLevels] || activityLevels.moderate;
      
      // Calculate the calories
      const result = await calculateCalories(formData, selectedLevel);
      setCalorieNeeds(result);
      
      return result;
    } catch (error) {
      console.error("Error calculating calories:", error);
      toast.error("Erro ao calcular calorias");
    } finally {
      setLoading(false);
    }
  };

  const calculateCalories = async (
    formData: CalorieCalculatorForm, 
    selectedLevel: { multiplier: number }
  ) => {
    // Convert values to numbers
    const age = Number(formData.age);
    const weight = Number(formData.weight);
    const height = Number(formData.height);
    
    // Calculate BMR using Mifflin-St Jeor equation
    let bmr;
    if (formData.gender === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    // Apply activity level multiplier
    let tdee = Math.round(bmr * selectedLevel.multiplier);
    
    // Adjust for goal
    const goalMultipliers = {
      "weight_loss": 0.8,   // 20% deficit
      "maintenance": 1.0,   // Maintain
      "muscle_gain": 1.1    // 10% surplus
    };
    
    const goalMultiplier = goalMultipliers[formData.goal as keyof typeof goalMultipliers] || 1.0;
    
    // Calculate final calories
    const finalCalories = Math.round(tdee * goalMultiplier);
    
    return finalCalories;
  };

  return {
    formData,
    setFormData,
    calorieNeeds,
    loading,
    handleCalculateCalories,
    calculateCalories
  };
};
