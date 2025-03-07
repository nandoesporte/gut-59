
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MealPlan, ProtocolFood } from "../types";
import { useMealPlanGeneration } from "./useMealPlanGeneration";
import { useCalorieCalculator, CalorieCalculatorForm, Goal } from "./useCalorieCalculator";
import { useFoodSelection } from "./useFoodSelection";
import { usePaymentHandling } from "./usePaymentHandling";
import { useUserWallet } from '@/hooks/use-wallet';
import { useUserProfile } from '@/hooks/use-user-profile';

export const useMenuController = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [dietaryPreferences, setDietaryPreferences] = useState({
    hasAllergies: false,
    allergies: [] as string[],
    dietaryRestrictions: [] as string[],
    trainingTime: ""
  });
  const [foodsError, setFoodsError] = useState<Error | null>(null);
  
  // Get the hooks
  const {
    formData,
    setFormData,
    calorieNeeds,
    loading: calorieLoading,
    handleCalculateCalories
  } = useCalorieCalculator();
  
  const {
    protocolFoods,
    selectedFoods,
    foodsByMealType,
    totalCalories,
    loading: foodsLoading,
    setSelectedFoods,
    handleFoodSelection,
    loadFoods
  } = useFoodSelection();
  
  const { 
    generateMealPlan, 
    loading: generationLoading,
    mealPlanResult
  } = useMealPlanGeneration();
  
  const {
    hasPaid,
    isProcessingPayment,
    handlePaymentAndContinue,
    showConfirmation,
    setShowConfirmation
  } = usePaymentHandling('nutrition');
  
  const { wallet } = useUserWallet();
  const { profile } = useUserProfile();
  
  const loading = calorieLoading || foodsLoading || generationLoading || isProcessingPayment;
  
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadFoods();
      } catch (error) {
        console.error("Error loading foods:", error);
        setFoodsError(error instanceof Error ? error : new Error("Failed to load foods"));
      }
    };

    loadData();
  }, []);
  
  useEffect(() => {
    if (mealPlanResult) {
      setMealPlan(mealPlanResult);
    }
  }, [mealPlanResult]);
  
  // Load user preferences if available
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: nutritionPrefs, error } = await supabase
          .from('nutrition_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        
        if (nutritionPrefs) {
          // Update form with saved preferences
          setFormData({
            age: nutritionPrefs.age?.toString() || "",
            weight: nutritionPrefs.weight?.toString() || "",
            height: nutritionPrefs.height?.toString() || "",
            gender: nutritionPrefs.gender as "male" | "female" || "male",
            activityLevel: nutritionPrefs.activity_level || "moderate",
            goal: mapDatabaseGoalToLocalGoal(nutritionPrefs.goal)
          });
        }
        
        // Load dietary preferences
        const { data: dietPrefs, error: dietError } = await supabase
          .from('dietary_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (dietError) throw dietError;
        
        if (dietPrefs) {
          setDietaryPreferences({
            hasAllergies: dietPrefs.has_allergies || false,
            allergies: dietPrefs.allergies || [],
            dietaryRestrictions: dietPrefs.dietary_restrictions || [],
            trainingTime: dietPrefs.training_time || ""
          });
        }
      } catch (error) {
        console.error("Error loading user preferences:", error);
      }
    };
    
    loadUserPreferences();
  }, []);

  // Helper to map database goal format to local Goal type format
  const mapDatabaseGoalToLocalGoal = (dbGoal: string | null): Goal => {
    switch (dbGoal) {
      case "lose_weight":
        return "weight_loss";
      case "gain_mass":
        return "muscle_gain";
      case "maintain":
      case "maintenance":
      default:
        return "maintenance";
    }
  };
  
  // Helper to map local Goal type format to database format
  const mapLocalGoalToDatabaseGoal = (localGoal: Goal): string => {
    switch (localGoal) {
      case "weight_loss":
        return "lose_weight";
      case "muscle_gain":
        return "gain_mass";
      case "maintenance":
      default:
        return "maintain";
    }
  };
  
  const handleConfirmFoodSelection = (): Promise<boolean> => {
    if (selectedFoods.length < 5) {
      toast.error("Por favor, selecione pelo menos 5 alimentos");
      return Promise.resolve(false);
    }
    
    setCurrentStep(3);
    return Promise.resolve(true);
  };
  
  const handleDietaryPreferences = async (preferences: typeof dietaryPreferences) => {
    try {
      setDietaryPreferences(preferences);
      
      // Save user dietary preferences
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('update_dietary_preferences', {
          p_user_id: user.id,
          p_has_allergies: preferences.hasAllergies,
          p_allergies: preferences.allergies,
          p_dietary_restrictions: preferences.dietaryRestrictions,
          p_training_time: preferences.trainingTime || null
        });
        
        // Save nutrition preferences
        const foodIds = selectedFoods.map(food => food.id);
        
        await supabase.rpc('update_nutrition_preferences', {
          p_user_id: user.id,
          p_data: {
            weight: parseFloat(formData.weight),
            height: parseFloat(formData.height),
            age: parseInt(formData.age),
            gender: formData.gender,
            activity_level: formData.activityLevel,
            goal: mapLocalGoalToDatabaseGoal(formData.goal),
            calories_needed: calorieNeeds,
            selected_foods: foodIds
          }
        });
      }
      
      // Move to payment step if needed, or directly to generation
      handlePaymentAndContinue().then(() => {
        if (hasPaid) {
          generateMealPlanNow();
        }
      });
      
      return true;
    } catch (error) {
      console.error("Error saving dietary preferences:", error);
      toast.error("Erro ao salvar preferências dietéticas");
      return false;
    }
  };
  
  const generateMealPlanNow = async () => {
    try {
      setCurrentStep(4);
      await generateMealPlan({
        calorieNeeds,
        selectedFoods,
        dietaryPreferences
      });
      return true;
    } catch (error) {
      console.error("Error generating meal plan:", error);
      toast.error("Erro ao gerar plano alimentar");
      return false;
    }
  };
  
  // Listen for payment confirmation
  useEffect(() => {
    if (hasPaid && currentStep === 3) {
      generateMealPlanNow();
    }
  }, [hasPaid, currentStep]);

  return {
    currentStep,
    setCurrentStep,
    calorieNeeds,
    selectedFoods,
    protocolFoods,
    foodsByMealType,
    totalCalories,
    dietaryPreferences,
    mealPlan,
    formData,
    loading,
    foodsError,
    setFormData,
    handleCalculateCalories,
    handleFoodSelection,
    handleConfirmFoodSelection,
    handleDietaryPreferences,
    showConfirmation,
    setShowConfirmation,
    hasPaid
  };
};
