
import { useState, useEffect } from "react";
import { useCalorieCalculator } from "./useCalorieCalculator";
import { useFoodSelection } from "./useFoodSelection";
import { MealPlan, DietaryPreferences, ProtocolFood } from "../types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateMealPlan } from "./useMealPlanGeneration";
import { useUserWallet } from "@/hooks/use-wallet";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useNavigate } from "react-router-dom";

export const useMenuController = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences>({
    hasAllergies: false,
    allergies: [],
    dietaryRestrictions: []
  });
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [foodsError, setFoodsError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPlanPreview, setShowPlanPreview] = useState(false);
  const { profile } = useUserProfile();
  const { addTransaction } = useUserWallet();
  const navigate = useNavigate();
  
  const {
    formData,
    setFormData,
    calorieNeeds,
    handleCalculateCalories,
  } = useCalorieCalculator();
  
  const {
    protocolFoods,
    selectedFoods,
    foodsByMealType,
    totalCalories,
    setSelectedFoods,
    handleFoodSelection,
    loadFoods,
  } = useFoodSelection();
  
  useEffect(() => {
    loadFoods().catch(error => {
      console.error("Erro ao carregar alimentos:", error);
      setFoodsError(error as Error);
      toast.error("Erro ao carregar alimentos");
    });
  }, []);
  
  const handleConfirmFoodSelection = async () => {
    if (selectedFoods.length === 0) {
      toast.error("Selecione pelo menos um alimento para continuar");
      return;
    }

    if (selectedFoods.length < 10) {
      toast.warning("Recomendamos selecionar pelo menos 10 alimentos para um plano mais variado");
    }

    try {
      // Save selected foods to user preferences in Supabase
      if (profile?.id) {
        const foodIds = selectedFoods.map(food => food.id);
        const { error } = await supabase.rpc('update_nutrition_selected_foods', {
          p_user_id: profile.id,
          p_selected_foods: foodIds
        });
        
        if (error) {
          console.error("Erro ao salvar alimentos selecionados:", error);
        }
      }
      
      // Move to next step
      setCurrentStep(3);
      
    } catch (error) {
      console.error("Erro ao processar seleção de alimentos:", error);
      toast.error("Erro ao processar seleção de alimentos");
    }
  };
  
  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {
    setDietaryPreferences(preferences);
    setLoading(true);
    
    try {
      // Save dietary preferences to Supabase
      if (profile?.id) {
        const { error } = await supabase.rpc('update_dietary_preferences', {
          p_user_id: profile.id,
          p_has_allergies: preferences.hasAllergies,
          p_allergies: preferences.allergies,
          p_dietary_restrictions: preferences.dietaryRestrictions,
          p_training_time: preferences.trainingTime || null
        });
        
        if (error) {
          console.error("Erro ao salvar preferências dietéticas:", error);
        }
      }
      
      // Generate meal plan using Edge Function
      const userData = {
        id: profile?.id,
        weight: Number(formData.weight),
        height: Number(formData.height),
        age: Number(formData.age),
        gender: formData.gender,
        activityLevel: formData.activityLevel,
        goal: formData.goal,
        dailyCalories: calorieNeeds
      };
      
      const generatedMealPlan = await generateMealPlan({
        userData,
        selectedFoods,
        foodsByMealType,
        preferences,
        addTransaction
      });
      
      if (generatedMealPlan) {
        setMealPlan(generatedMealPlan);
        setCurrentStep(4);
      } else {
        throw new Error("Falha ao gerar plano alimentar");
      }
      
    } catch (error) {
      console.error("Erro no processo de geração de plano alimentar:", error);
      toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  
  return {
    currentStep,
    setCurrentStep,
    calorieNeeds,
    selectedFoods,
    totalCalories,
    formData,
    setFormData,
    protocolFoods,
    dietaryPreferences,
    mealPlan,
    loading,
    foodsError,
    handleCalculateCalories,
    handleFoodSelection,
    handleConfirmFoodSelection,
    handleDietaryPreferences,
    showPlanPreview,
    setShowPlanPreview
  };
};
