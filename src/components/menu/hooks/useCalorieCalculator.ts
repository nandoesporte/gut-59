
import { useState } from "react";
import { toast } from "sonner";
import type { CalorieCalculatorForm } from "../CalorieCalculator";
import { activityLevels } from "../CalorieCalculator";

export const useCalorieCalculator = (onComplete: (calories: number) => void) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CalorieCalculatorForm>({
    weight: 0,
    height: 0,
    age: 0,
    gender: "male",
    activityLevel: "",
    goal: null,
    healthCondition: null,
  });

  const calculateBMR = (data: CalorieCalculatorForm) => {
    if (data.gender === "male") {
      return 88.36 + (13.4 * data.weight) + (4.8 * data.height) - (5.7 * data.age);
    } else {
      return 447.6 + (9.2 * data.weight) + (3.1 * data.height) - (4.3 * data.age);
    }
  };

  const handleCalculateCalories = () => {
    setLoading(true);
    toast.loading("Calculando suas necessidades calóricas...");
    
    setTimeout(() => {
      const bmr = calculateBMR(formData);
      const activityFactor = activityLevels[formData.activityLevel as keyof typeof activityLevels].factor;
      const goalFactors = {
        lose: 0.8,
        maintain: 1,
        gain: 1.2
      };
      const goalFactor = goalFactors[formData.goal];
      const dailyCalories = Math.round(bmr * activityFactor * goalFactor);

      setLoading(false);
      toast.success("Cálculo concluído!");
      onComplete(dailyCalories);
    }, 1500);
  };

  return {
    formData,
    setFormData,
    loading,
    handleCalculateCalories
  };
};
