
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MealPlan, ProtocolFood, DietaryPreferences, TransactionInput, TransactionParams } from "../types";
import { useCalorieCalculator } from "./useCalorieCalculator";
import { generateMealPlan } from "./useMealPlanGeneration";
import { useProtocolFoods } from "./useProtocolFoods";
import { usePaymentHandling } from "./usePaymentHandling";
import { generateMealPlanPDF } from "../utils/pdf-generator";
import { useWallet } from "@/hooks/useWallet";
import { TransactionType } from "@/types/wallet";

// Define types for menu workflow states
type MenuStep = 'initial' | 'calculator' | 'foods' | 'preferences' | 'result';

interface UserCalorieData {
  userId?: string;
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  dailyCalories: number;
}

interface CalorieCalculatorForm {
  weight: string;
  height: string;
  age: string;
  gender: "male" | "female";
  activityLevel: string;
  goal: string;
}

// Main hook for menu controller
export const useMenuController = () => {
  // State variables for workflow
  const [currentStep, setCurrentStep] = useState<MenuStep>('initial');
  const [isStepCompleted, setIsStepCompleted] = useState<Record<MenuStep, boolean>>({
    initial: true,
    calculator: false,
    foods: false,
    preferences: false,
    result: false
  });
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CalorieCalculatorForm>({
    weight: '',
    height: '',
    age: '',
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain'
  });
  const [userData, setUserData] = useState<UserCalorieData>({
    weight: 0,
    height: 0,
    age: 0,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain',
    dailyCalories: 0
  });
  const [calorieNeeds, setCalorieNeeds] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [totalCalories, setTotalCalories] = useState(0);
  
  // Set up hooks for different functionalities
  const { calculateCalories } = useCalorieCalculator();
  const { 
    protocolFoods, 
    selectedFoods, 
    toggleFoodSelection, 
    selectedFoodCount,
    isLoadingFoods,
    loading: loadingFoods,
    error: foodsError
  } = useProtocolFoods();
  
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences>({
    hasAllergies: false,
    allergies: [],
    dietaryRestrictions: [],
    trainingTime: undefined
  });

  // Payment handling for meal plan generation
  const { 
    isProcessingPayment,
    preferenceId,
    hasPaid,
    currentPrice,
    handlePaymentAndContinue,
    showConfirmation,
    setShowConfirmation,
    confirmationMessage,
    addTransactionAsync
  } = usePaymentHandling();

  // Payment access state
  const [hasPlanAccess, setHasPlanAccess] = useState(false);
  const [isPlanAccessLoading, setIsPlanAccessLoading] = useState(false);
  const [loadingPlanAccess, setLoadingPlanAccess] = useState(false);
  
  const createPayment = async () => {
    // Implementation for creating payment
    toast.info("Creating payment...");
    return true;
  };
  
  const checkPaymentStatus = async () => {
    // Implementation for checking payment
    return true;
  };
  
  const setPlanAccess = async () => {
    setHasPlanAccess(true);
    return true;
  };
  
  // Wallet integration for balance and transactions
  const { addTransaction } = useWallet();

  // Effect to check if user has access to meal plan generation
  useEffect(() => {
    if (!loadingPlanAccess && !hasPlanAccess) {
      console.log("User does not have meal plan access");
    }
  }, [loadingPlanAccess, hasPlanAccess]);

  // Navigation functions
  const goToStep = useCallback((step: MenuStep) => {
    // Only allow navigation to steps that have prerequisites completed
    switch (step) {
      case 'foods':
        if (!isStepCompleted.calculator) {
          toast.error("Complete a calculadora de calorias primeiro");
          return;
        }
        break;
      case 'preferences':
        if (!isStepCompleted.foods) {
          toast.error("Selecione alimentos primeiro");
          return;
        }
        break;
      case 'result':
        if (!isStepCompleted.preferences) {
          toast.error("Configure suas preferências primeiro");
          return;
        }
        break;
      default:
        break;
    }
    
    setCurrentStep(step);
  }, [isStepCompleted]);

  // Handle calculator completion
  const handleCaloriesCalculated = useCallback(() => {
    const calories = calculateCalories(formData, {
      multiplier: 1.2 // Default multiplier
    });
    
    setCalorieNeeds(calories);
    setUserData({
      weight: Number(formData.weight),
      height: Number(formData.height),
      age: Number(formData.age),
      gender: formData.gender,
      activityLevel: formData.activityLevel,
      goal: formData.goal,
      dailyCalories: calories
    });
    
    setIsStepCompleted(prev => ({ ...prev, calculator: true }));
    goToStep('foods');
  }, [formData, calculateCalories, goToStep]);

  // Handle foods selection completion
  const handleFoodsSelected = useCallback(() => {
    if (selectedFoodCount < 5) {
      toast.error("Selecione pelo menos 5 alimentos");
      return;
    }
    
    setIsStepCompleted(prev => ({ ...prev, foods: true }));
    goToStep('preferences');
  }, [selectedFoodCount, goToStep]);

  // Handle food selection
  const handleFoodSelection = useCallback((food: ProtocolFood) => {
    toggleFoodSelection(food);
  }, [toggleFoodSelection]);

  // Handle confirm food selection
  const handleConfirmFoodSelection = useCallback(() => {
    handleFoodsSelected();
  }, [handleFoodsSelected]);

  // Handle preferences completion
  const handlePreferencesSubmitted = useCallback((preferences: DietaryPreferences) => {
    setDietaryPreferences(preferences);
    setIsStepCompleted(prev => ({ ...prev, preferences: true }));
    
    // Check if user has access to meal plan generation
    if (hasPlanAccess) {
      handleGenerateMealPlan();
    } else {
      setIsPaymentDialogOpen(true);
    }
  }, [hasPlanAccess]);

  // Handle dietary preferences
  const handleDietaryPreferences = useCallback((preferences: DietaryPreferences) => {
    handlePreferencesSubmitted(preferences);
  }, [handlePreferencesSubmitted]);

  // Organize selected foods by meal type
  const organizeFoodsByMealType = useCallback(() => {
    // Create a mapping of foods to each meal type
    const foodsByMealType: Record<string, ProtocolFood[]> = {
      breakfast: [],
      morning_snack: [],
      lunch: [],
      afternoon_snack: [],
      dinner: []
    };
    
    // For each selected food, assign it to appropriate meal types
    selectedFoods.forEach(food => {
      // If food has meal_type property, use it
      if (food.meal_type && Array.isArray(food.meal_type)) {
        food.meal_type.forEach(mealType => {
          if (mealType in foodsByMealType) {
            foodsByMealType[mealType].push(food);
          }
        });
      } else {
        // If no meal_type, assign to all meal types
        foodsByMealType.breakfast.push(food);
        foodsByMealType.morning_snack.push(food);
        foodsByMealType.lunch.push(food);
        foodsByMealType.afternoon_snack.push(food);
        foodsByMealType.dinner.push(food);
      }
    });
    
    return foodsByMealType;
  }, [selectedFoods]);

  // Handle meal plan generation
  const handleGenerateMealPlan = useCallback(async () => {
    setIsGenerating(true);
    setLoading(true);
    toast.loading("Gerando plano alimentar personalizado...");
    
    try {
      // Map foods to meal types
      const foodsByMealType = organizeFoodsByMealType();
      
      // Prepare transaction function for wallet
      const handleAddTransaction = async (params: TransactionParams) => {
        if (addTransaction) {
          const transactionType = params.type as TransactionType;
          await addTransaction({
            ...params,
            type: transactionType
          } as TransactionInput);
        }
      };
      
      // Generate the meal plan
      const generatedPlan = await generateMealPlan({
        userData: {
          id: userData.userId,
          ...userData
        },
        selectedFoods,
        foodsByMealType,
        preferences: dietaryPreferences,
        addTransaction: handleAddTransaction
      });
      
      if (generatedPlan) {
        setMealPlan(generatedPlan);
        setIsStepCompleted(prev => ({ ...prev, result: true }));
        goToStep('result');
        toast.success("Plano alimentar gerado com sucesso!");
      } else {
        toast.error("Falha ao gerar plano alimentar. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao gerar plano alimentar:", error);
      toast.error("Erro ao gerar plano alimentar. Tente novamente mais tarde.");
    } finally {
      setIsGenerating(false);
      setLoading(false);
      toast.dismiss();
    }
  }, [userData, selectedFoods, dietaryPreferences, goToStep, organizeFoodsByMealType, addTransaction]);

  // Handle payment completion
  const handlePaymentCompleted = useCallback(async () => {
    await setPlanAccess();
    handleGenerateMealPlan();
    setIsPaymentDialogOpen(false);
  }, [setPlanAccess, handleGenerateMealPlan]);

  // Handle saving meal plan as PDF
  const handleSavePDF = useCallback(async () => {
    if (!mealPlan) return;
    
    try {
      const pdfBlob = await generateMealPlanPDF(mealPlan, userData.dailyCalories);
      
      // Create download link and trigger download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plano-alimentar.pdf';
      link.click();
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  }, [mealPlan, userData]);

  // Reset the workflow
  const handleReset = useCallback(() => {
    setMealPlan(null);
    setIsStepCompleted({
      initial: true,
      calculator: false,
      foods: false,
      preferences: false,
      result: false
    });
    setCurrentStep('initial');
  }, []);

  return {
    currentStep,
    setCurrentStep,
    isStepCompleted,
    mealPlan,
    isGenerating,
    userData,
    calorieNeeds,
    protocolFoods,
    selectedFoods,
    toggleFoodSelection,
    selectedFoodCount,
    loading,
    isLoadingFoods,
    foodsError,
    dietaryPreferences,
    formData,
    setFormData,
    totalCalories,
    setDietaryPreferences,
    isPaymentDialogOpen,
    setIsPaymentDialogOpen,
    isPlanAccessLoading,
    hasPlanAccess,
    createPayment,
    checkPaymentStatus,
    goToStep,
    handleCaloriesCalculated,
    handleFoodSelection,
    handleConfirmFoodSelection,
    handleFoodsSelected,
    handleDietaryPreferences,
    handleGenerateMealPlan,
    handlePaymentCompleted,
    handleSavePDF,
    handleReset
  };
};
