
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProtocolFood, MealPlan, DietaryPreferences } from "../types";
import { useCalorieCalculator } from "./useCalorieCalculator";
import { useFoodSelection } from "./useFoodSelection";
import { useMealPlanGeneration } from "./useMealPlanGeneration";
import { useProtocolFoods } from "./useProtocolFoods";

interface FormData {
  age: number;
  weight: number;
  height: number;
  gender: string;
  activity_level: string;
  goal: string;
}

export const useMenuController = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    age: 30,
    weight: 70,
    height: 170,
    gender: 'male',
    activity_level: 'moderate',
    goal: 'maintain'
  });
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences>({
    hasAllergies: false,
    allergies: [],
    dietaryRestrictions: [],
    trainingTime: null
  });
  
  // Import hooks
  const { calculateCalories, calorieNeeds, setCalorieNeeds } = useCalorieCalculator();
  const { protocolFoods, foodsError } = useProtocolFoods();
  const { selectedFoods, handleFoodSelection, totalCalories } = useFoodSelection();
  const { loading, mealPlan, error, generatePlan, loadingTime, setMealPlan } = useMealPlanGeneration();

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user ?? null);
    };
    getUser();
  }, []);

  // Handle step 1: Calculate calories
  const handleCalculateCalories = () => {
    try {
      const calculatedCalories = calculateCalories(
        formData.gender,
        formData.age,
        formData.weight,
        formData.height,
        formData.activity_level,
        formData.goal
      );
      setCalorieNeeds(calculatedCalories);
      setCurrentStep(2);
    } catch (error) {
      toast.error("Erro ao calcular calorias. Verifique os dados informados.");
    }
  };

  // Handle step 2: Food selection
  const handleConfirmFoodSelection = () => {
    if (selectedFoods.length === 0) {
      toast.error("Selecione pelo menos um alimento para continuar.");
      return;
    }
    setCurrentStep(3);
  };

  // Handle step 3: Dietary preferences
  const handleDietaryPreferences = (preferences: DietaryPreferences) => {
    setDietaryPreferences(preferences);
    
    // Organize foods by meal type for the API
    const foodsByMealType: Record<string, string[]> = {
      breakfast: [],
      morningSnack: [],
      lunch: [],
      afternoonSnack: [],
      dinner: []
    };
    
    // Prepare user data
    const userData = {
      id: user?.id,
      weight: formData.weight,
      height: formData.height,
      age: formData.age,
      gender: formData.gender,
      activityLevel: formData.activity_level,
      goal: formData.goal,
      dailyCalories: calorieNeeds
    };
    
    // Generate the meal plan
    generatePlan(userData, selectedFoods, foodsByMealType, preferences)
      .then(() => {
        setCurrentStep(4);
      })
      .catch((error) => {
        console.error("Erro ao gerar plano alimentar:", error);
        toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
      });
  };
  
  // Function to handle regenerating the meal plan
  const handleRegeneratePlan = async () => {
    if (!calorieNeeds || selectedFoods.length === 0) {
      toast.error("Informações insuficientes para gerar o plano. Por favor, complete os passos anteriores.");
      return;
    }
    
    // Organize foods by meal type
    const foodsByMealType: Record<string, string[]> = {
      breakfast: [],
      morningSnack: [],
      lunch: [],
      afternoonSnack: [],
      dinner: []
    };
    
    // Prepare user data
    const userData = {
      id: user?.id,
      weight: formData.weight,
      height: formData.height,
      age: formData.age,
      gender: formData.gender,
      activityLevel: formData.activity_level,
      goal: formData.goal,
      dailyCalories: calorieNeeds
    };
    
    // Clear previous meal plan to avoid stale data
    setMealPlan(null);
    
    // Generate new meal plan
    try {
      await generatePlan(userData, selectedFoods, foodsByMealType, dietaryPreferences);
    } catch (error) {
      console.error("Erro ao regenerar plano alimentar:", error);
      toast.error("Erro ao regenerar plano alimentar. Por favor, tente novamente.");
    }
  };

  return {
    currentStep,
    setCurrentStep,
    formData,
    setFormData,
    calorieNeeds,
    selectedFoods,
    protocolFoods,
    totalCalories,
    mealPlan,
    loading,
    error,
    foodsError,
    handleCalculateCalories,
    handleFoodSelection,
    handleConfirmFoodSelection,
    handleDietaryPreferences,
    handleRegeneratePlan,
    loadingTime
  };
};
