
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MealPlan, ProtocolFood, DietaryPreferences, TransactionParams, MenuStep } from "../types";
import { useCalorieCalculator, Goal } from "./useCalorieCalculator";
import { generateMealPlan } from "./useMealPlanGeneration";
import { useProtocolFoods } from "./useProtocolFoods";
import { usePaymentHandling } from "./usePaymentHandling";
import { useWallet } from "@/hooks/useWallet";
import { TransactionType } from "@/types/wallet";
import { TransactionInput } from "@/hooks/wallet/types";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface CalorieCalculatorForm {
  weight: string;
  height: string;
  age: string;
  gender: "male" | "female";
  activityLevel: string;
  goal: Goal;
}

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
    error: foodsError,
    foodsByMealType
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

  // Handle meal plan generation
  const handleGenerateMealPlan = useCallback(async () => {
    setIsGenerating(true);
    setLoading(true);
    toast.loading("Gerando plano alimentar personalizado...");
    
    try {
      // Prepare transaction function for wallet
      const handleAddTransaction = async (params: TransactionParams) => {
        if (addTransaction) {
          const transactionType = params.type as unknown as TransactionType;
          await addTransaction({
            ...params,
            type: transactionType
          } as unknown as TransactionInput);
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
  }, [userData, selectedFoods, dietaryPreferences, goToStep, foodsByMealType, addTransaction]);

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
      const element = document.getElementById('meal-plan-container');
      if (!element) {
        toast.error("Elemento do plano alimentar não encontrado");
        return;
      }
      
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('plano-alimentar.pdf');
      
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  }, [mealPlan]);

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
