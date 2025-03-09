
import { useState, useEffect, useCallback } from "react";
import { useProtocolFoods } from "./useProtocolFoods";
import { useCalorieCalculator } from "./useCalorieCalculator";
import { useFoodSelection } from "./useFoodSelection";
import { generateMealPlan } from "./useMealPlanGeneration";
import { DietaryPreferences, MealPlan, ProtocolFood } from "../types";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
interface FormData {
  weight: string;
  height: string;
  age: string;
  gender: string;
  activityLevel: string;
  goal: string;
}

interface MenuState {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  calorieNeeds: number;
  selectedFoods: ProtocolFood[];
  protocolFoods: ProtocolFood[];
  totalCalories: number; 
  mealPlan: MealPlan | null;
  formData: FormData;
  loading: boolean;
  foodsError: Error | null;
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void;
  handleCalculateCalories: () => void;
  handleFoodSelection: (food: ProtocolFood) => void;
  handleConfirmFoodSelection: () => void;
  handleDietaryPreferences: (preferences: DietaryPreferences) => void;
}

export const useMenuController = (): MenuState => {
  // State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [calorieNeeds, setCalorieNeeds] = useState<number>(0);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences>({
    hasAllergies: false,
    allergies: [],
    dietaryRestrictions: [],
    trainingTime: null,
  });
  const [formData, setFormData] = useState<FormData>({
    weight: "70",
    height: "170",
    age: "30",
    gender: "male",
    activityLevel: "moderate",
    goal: "maintenance",
  });
  
  const { protocolFoods, error: foodsError, foodsByMealType } = useProtocolFoods();
  const { calculateCalories } = useCalorieCalculator();
  const { 
    selectedFoods, 
    totalCalories, 
    handleFoodSelection: handleFoodSelect,
    addFood,
    resetSelection 
  } = useFoodSelection();
  
  const wallet = useWallet();

  // Check for authenticated user
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("User not authenticated, some features will be limited");
      } else {
        console.log("User authenticated:", user.id);
        loadSavedPreferences(user.id);
      }
    };
    
    checkUser();
  }, []);
  
  // Load saved preferences for authenticated users
  const loadSavedPreferences = async (userId: string) => {
    try {
      // Fetch nutrition preferences
      const { data: nutritionPrefs, error: nutritionError } = await supabase
        .from('nutrition_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (nutritionError && !nutritionError.message.includes("no rows")) {
        console.error("Erro ao carregar preferências nutricionais:", nutritionError);
      } else if (nutritionPrefs) {
        console.log("Loaded nutrition preferences:", nutritionPrefs);
        setFormData(prev => ({
          ...prev,
          weight: nutritionPrefs.weight ? nutritionPrefs.weight.toString() : prev.weight,
          height: nutritionPrefs.height ? nutritionPrefs.height.toString() : prev.height,
          age: nutritionPrefs.age ? nutritionPrefs.age.toString() : prev.age,
          gender: nutritionPrefs.gender || prev.gender,
          activityLevel: nutritionPrefs.activity_level || prev.activityLevel,
          goal: nutritionPrefs.goal || prev.goal,
        }));
      }
      
      // Fetch dietary preferences
      const { data: dietaryPrefs, error: dietaryError } = await supabase
        .from('dietary_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (dietaryError && !dietaryError.message.includes("no rows")) {
        console.error("Erro ao carregar preferências alimentares:", dietaryError);
      } else if (dietaryPrefs) {
        console.log("Loaded dietary preferences:", dietaryPrefs);
        setDietaryPreferences(prev => ({
          ...prev,
          hasAllergies: dietaryPrefs.has_allergies || false,
          allergies: dietaryPrefs.allergies || [],
          dietaryRestrictions: dietaryPrefs.dietary_restrictions || [],
          trainingTime: dietaryPrefs.training_time || null,
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar preferências:", error);
    }
  };

  // Handle Calorie Calculation
  const handleCalculateCalories = useCallback(() => {
    const calculatedCalories = calculateCalories(
      formData.weight,
      formData.height,
      formData.age,
      formData.gender,
      formData.activityLevel,
      formData.goal
    );
    
    setCalorieNeeds(calculatedCalories);
    setCurrentStep(2);
    
    // Save nutrition preferences for authenticated users
    const savePreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase.from('nutrition_preferences').upsert({
            user_id: user.id,
            weight: parseFloat(formData.weight),
            height: parseFloat(formData.height),
            age: parseInt(formData.age),
            gender: formData.gender,
            activity_level: formData.activityLevel,
            goal: formData.goal,
            calories_needed: calculatedCalories
          });
          
          if (error) {
            console.error("Error saving nutrition preferences:", error);
          }
        }
      } catch (error) {
        console.error("Error saving nutrition preferences:", error);
      }
    };
    
    savePreferences();
  }, [formData, calculateCalories]);

  // Handle Food Selection
  const handleFoodSelection = useCallback((food: ProtocolFood) => {
    handleFoodSelect(food);
  }, [handleFoodSelect]);

  // Handle Confirm Food Selection
  const handleConfirmFoodSelection = useCallback(() => {
    if (selectedFoods.length === 0) {
      toast.error("Por favor, selecione pelo menos um alimento.");
      return;
    }
    setCurrentStep(3);
  }, [selectedFoods]);

  // Handle Dietary Preferences
  const handleDietaryPreferences = useCallback(async (preferences: DietaryPreferences) => {
    setDietaryPreferences(preferences);
    setLoading(true);
    
    // Save dietary preferences for authenticated users
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('dietary_preferences').upsert({
          user_id: user.id,
          has_allergies: preferences.hasAllergies,
          allergies: preferences.allergies,
          dietary_restrictions: preferences.dietaryRestrictions,
          training_time: preferences.trainingTime
        });
        
        if (error) {
          console.error("Error saving dietary preferences:", error);
        }
      }
    } catch (error) {
      console.error("Error saving dietary preferences:", error);
    }
    
    try {
      // Get user data
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate the meal plan
      const generatedPlan = await generateMealPlan({
        userData: {
          id: user?.id,
          weight: parseFloat(formData.weight),
          height: parseFloat(formData.height),
          age: parseInt(formData.age),
          gender: formData.gender,
          activityLevel: formData.activityLevel,
          goal: formData.goal,
          dailyCalories: calorieNeeds
        },
        selectedFoods,
        foodsByMealType,
        preferences,
        addTransaction: wallet ? async (params) => {
          try {
            wallet.addTransaction(params);
          } catch (e) {
            console.error("Error adding transaction:", e);
          }
        } : undefined
      });

      if (generatedPlan) {
        setMealPlan(generatedPlan);
        setCurrentStep(4);
      } else {
        toast.error("Não foi possível gerar o plano alimentar. Por favor, tente novamente.");
      }
    } catch (error) {
      console.error("Error generating meal plan:", error);
      toast.error("Erro ao gerar o plano alimentar. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [formData, calorieNeeds, selectedFoods, foodsByMealType, wallet]);

  return {
    currentStep,
    setCurrentStep,
    calorieNeeds,
    selectedFoods,
    protocolFoods,
    totalCalories,
    mealPlan,
    formData,
    loading,
    foodsError,
    setFormData,
    handleCalculateCalories,
    handleFoodSelection,
    handleConfirmFoodSelection,
    handleDietaryPreferences,
  };
};
