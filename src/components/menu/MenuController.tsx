
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { DietaryPreferences, MealPlan } from "./types";
import { CalorieCalculatorForm, activityLevels } from "./CalorieCalculator";
import { useProtocolFoods } from "./hooks/useProtocolFoods";
import { useCalorieCalculator } from "./hooks/useCalorieCalculator";
import { useFoodSelection } from "./hooks/useFoodSelection";
import { useMenuDatabase } from "./hooks/useMenuDatabase";
import { useMealPlanManager } from "./hooks/useMealPlanManager";

export const useMenuController = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences | null>(null);
  const [formData, setFormData] = useState<CalorieCalculatorForm>({
    weight: "",
    height: "",
    age: "",
    gender: "male",
    activityLevel: "",
    goal: undefined,
  });

  const protocolFoods = useProtocolFoods();
  const { calorieNeeds, calculateCalories } = useCalorieCalculator();
  const { selectedFoods, foodsByMealType, totalCalories, handleFoodSelection, calculateTotalCalories, categorizeFoodsByMealType } = useFoodSelection();
  const menuDatabase = useMenuDatabase();
  const { mealPlan, loading, generateUserMealPlan, regenerateMealPlan, setMealPlan } = useMealPlanManager();

  useEffect(() => {
    calculateTotalCalories(protocolFoods);
  }, [selectedFoods, protocolFoods, calculateTotalCalories]);

  useEffect(() => {
    const loadSavedPreferences = async () => {
      try {
        const savedFoods = await menuDatabase.loadSavedFoodPreferences();
        
        if (savedFoods && Array.isArray(savedFoods)) {
          savedFoods.forEach(foodId => {
            if (typeof foodId === 'string' && !selectedFoods.includes(foodId)) {
              handleFoodSelection(foodId);
            }
          });
          
          if (savedFoods.length > 0) {
            categorizeFoodsByMealType(protocolFoods);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar preferências alimentares:', error);
        // Don't show toast here as it might be annoying on every load
      }
    };

    if (protocolFoods.length > 0) {
      loadSavedPreferences();
    }
  }, [protocolFoods, selectedFoods, handleFoodSelection, categorizeFoodsByMealType, menuDatabase]);

  const handleCalculateCalories = async () => {
    const selectedLevel = activityLevels.find(level => level.value === formData.activityLevel);
    if (!selectedLevel) {
      toast.error("Por favor, selecione um nível de atividade");
      return false;
    }

    try {
      const calories = await calculateCalories(formData, selectedLevel);
      if (calories) {
        toast.success("Calorias calculadas com sucesso!");
        
        try {
          // Try to save the calculation, but proceed even if it fails
          await menuDatabase.saveCalorieCalculation(formData, calories, selectedFoods);
        } catch (dbError) {
          console.error('Erro ao salvar cálculo de calorias:', dbError);
          // Continue despite database error
        }
        
        // Move to next step regardless of database operations
        setCurrentStep(2);
        console.log("Avançando para a etapa 2 (seleção de alimentos)");
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao calcular calorias:', error);
      toast.error("Erro ao calcular as calorias necessárias");
      return false;
    }
  };

  const handleConfirmFoodSelection = async () => {
    console.log("Iniciando confirmação de seleção de alimentos");
    
    if (selectedFoods.length === 0) {
      console.warn("Nenhum alimento selecionado!");
      toast.error("Por favor, selecione pelo menos um alimento antes de prosseguir");
      return false;
    }
    
    toast.success("Processando sua seleção de alimentos...");
    
    try {
      const success = await menuDatabase.saveFoodSelection(selectedFoods, formData);
      
      if (success) {
        console.log("Preferências de alimentos salvas com sucesso!");
        console.log("Avançando para a etapa 3 (restrições dietéticas)");
        
        setCurrentStep(3);
        
        toast.success("Preferências de alimentos salvas! Agora informe suas restrições dietéticas.");
        return true;
      }
      
      console.error("Falha ao salvar preferências de alimentos");
      return false;
    } catch (error) {
      console.error("Erro ao salvar seleção de alimentos:", error);
      toast.error("Ocorreu um erro ao salvar suas preferências de alimentos");
      // Still proceed to next step even if database operation fails
      setCurrentStep(3);
      return true;
    }
  };

  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {
    try {
      const result = await generateUserMealPlan({
        formData,
        calorieNeeds,
        selectedFoods,
        foodsByMealType,
        protocolFoods,
        preferences
      });
      
      if (result) {
        setDietaryPreferences(preferences);
        setCurrentStep(4);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Erro ao processar preferências dietéticas:", error);
      toast.error("Ocorreu um erro ao processar suas preferências dietéticas");
      return false;
    }
  };

  const handleRegenerateMealPlan = async () => {
    try {
      toast.info("Gerando novo plano alimentar...");
      const success = await regenerateMealPlan(
        formData, 
        calorieNeeds,
        protocolFoods,
        foodsByMealType
      );
      
      return success;
    } catch (error) {
      console.error('Erro ao atualizar cardápio:', error);
      toast.error("Erro ao atualizar o cardápio");
      throw error;
    }
  };

  useEffect(() => {
    if (mealPlan) {
      console.log("PLANO ALIMENTAR ATUALIZADO:", mealPlan);
      console.log("Plano possui weeklyPlan?", !!mealPlan.weeklyPlan);
      console.log("Step atual:", currentStep);
    }
  }, [mealPlan, currentStep]);

  return {
    currentStep,
    setCurrentStep,
    calorieNeeds,
    selectedFoods,
    foodsByMealType,
    protocolFoods,
    totalCalories,
    mealPlan,
    formData,
    loading,
    handleCalculateCalories,
    handleFoodSelection,
    handleConfirmFoodSelection,
    handleDietaryPreferences,
    setFormData,
    regenerateMealPlan: handleRegenerateMealPlan,
  };
};
