import { useState, useEffect } from "react";
import type { CalorieCalculatorForm } from "./CalorieCalculator";
import { useProtocolFoods } from "./hooks/useProtocolFoods";
import { useCalorieCalculator } from "./hooks/useCalorieCalculator";
import { useFoodSelection } from "./hooks/useFoodSelection";
import { useMealPlan } from "./hooks/useMealPlan";
import { useNutritionPreferences } from "./hooks/useNutritionPreferences";

export const useMenuController = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);

  const { protocolFoods } = useProtocolFoods();
  const { preferences, loading: preferencesLoading, savePreferences, loadPreferences } = useNutritionPreferences();
  
  const { formData, setFormData, loading: calculatorLoading, handleCalculateCalories } = 
    useCalorieCalculator((calories) => {
      setCalorieNeeds(calories);
      setCurrentStep(2);
    });

  const { selectedFoods, totalCalories, handleFoodSelection } = 
    useFoodSelection(protocolFoods);

  const { loading: mealPlanLoading, mealPlan, handleDietaryPreferences: handleDietaryPreferencesBase } = 
    useMealPlan(formData, calorieNeeds, selectedFoods);

  useEffect(() => {
    loadPreferences();
  }, []);

  const handleSubmitNutritionForm = async (data: NutritionPreferences) => {
    const success = await savePreferences(data);
    if (success) {
      handleCalculateCalories();
    }
  };

  const handleDietaryPreferences = async (preferences) => {
    const success = await handleDietaryPreferencesBase(preferences);
    if (success) {
      setCurrentStep(4);
    }
  };

  return {
    currentStep,
    setCurrentStep,
    calorieNeeds,
    selectedFoods,
    protocolFoods,
    totalCalories,
    mealPlan,
    formData,
    preferences,
    loading: calculatorLoading || mealPlanLoading || preferencesLoading,
    handleCalculateCalories,
    handleFoodSelection,
    handleDietaryPreferences,
    handleSubmitNutritionForm,
    setFormData,
  };
};
