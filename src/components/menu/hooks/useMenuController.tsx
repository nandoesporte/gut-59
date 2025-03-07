
import { useState, useEffect, useCallback } from "react";
import { useProtocolFoods } from "./useProtocolFoods";
import { useCalorieCalculator, Goal } from "./useCalorieCalculator";
import { useFoodSelection } from "./useFoodSelection";
import { generateMealPlan } from "./useMealPlanGeneration";
import { DietaryPreferences, MealPlan, ProtocolFood } from "../types";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalorieCalculatorForm } from "../CalorieCalculator";
import type { Database } from "@/integrations/supabase/types";

export interface FormData {
  weight: number;
  height: number;
  age: number;
  gender: "male" | "female";
  activityLevel: string;
  goal: string;
}

interface MenuState {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  calorieNeeds: number;
  selectedFoods: string[];
  protocolFoods: ProtocolFood[];
  totalCalories: number; 
  mealPlan: MealPlan | null;
  formData: CalorieCalculatorForm;
  loading: boolean;
  foodsError: Error | null;
  setFormData: (data: CalorieCalculatorForm) => void;
  handleCalculateCalories: () => void;
  handleFoodSelection: (foodId: string, food?: ProtocolFood) => void;
  handleConfirmFoodSelection: () => void;
  handleDietaryPreferences: (preferences: DietaryPreferences) => void;
}

const mapGoalToDbEnum = (goal: Goal): Database['public']['Enums']['nutritional_goal'] => {
  const goalMap: Record<Goal, Database['public']['Enums']['nutritional_goal']> = {
    'lose': 'lose_weight',
    'maintain': 'maintain',
    'gain': 'gain_mass'
  };
  return goalMap[goal];
};

export const useMenuController = (): MenuState => {
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
  const [formData, setFormData] = useState<CalorieCalculatorForm>({
    weight: "70",
    height: "170",
    age: "30",
    gender: "male",
    activityLevel: "moderate",
    goal: "maintain"
  });
  
  const { protocolFoods, error: foodsError, foodsByMealType } = useProtocolFoods();
  const { calculateCalories } = useCalorieCalculator();
  const { 
    selectedFoods, 
    totalCalories, 
    handleFoodSelection, 
    calculateTotalCalories, 
    categorizeFoodsByMealType,
    addFood,
    resetSelection 
  } = useFoodSelection();
  
  const wallet = useWallet();

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
  
  const loadSavedPreferences = async (userId: string) => {
    try {
      const { data: nutritionPrefs, error: nutritionError } = await supabase
        .from('nutrition_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (nutritionError && !nutritionError.message.includes("no rows")) {
        console.error("Erro ao carregar preferências nutricionais:", nutritionError);
      } else if (nutritionPrefs) {
        console.log("Loaded nutrition preferences:", nutritionPrefs);
        setFormData({
          weight: String(nutritionPrefs.weight || 70),
          height: String(nutritionPrefs.height || 170),
          age: String(nutritionPrefs.age || 30),
          gender: (nutritionPrefs.gender === "female" ? "female" : "male"),
          activityLevel: nutritionPrefs.activity_level || "moderate",
          goal: nutritionPrefs.goal || "maintain",
        });
      }
      
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

  const handleCalculateCalories = useCallback(() => {
    const selectedLevel = activityLevels.find(level => level.value === formData.activityLevel);
    const calculatedCalories = calculateCalories(formData, selectedLevel || { multiplier: 1.2 });
    
    if (calculatedCalories) {
      setCalorieNeeds(calculatedCalories);
      setCurrentStep(2);
      
      const savePreferences = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const dbGoal = mapGoalToDbEnum(formData.goal as Goal);
            
            const { error } = await supabase.from('nutrition_preferences').upsert({
              user_id: user.id,
              weight: parseFloat(formData.weight),
              height: parseFloat(formData.height),
              age: parseFloat(formData.age),
              gender: formData.gender,
              activity_level: formData.activityLevel as any,
              goal: dbGoal,
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
    }
  }, [formData, calculateCalories]);

  const handleConfirmFoodSelection = useCallback(() => {
    if (selectedFoods.length === 0) {
      toast.error("Por favor, selecione pelo menos um alimento.");
      return;
    }
    setCurrentStep(3);
  }, [selectedFoods]);

  const handleDietaryPreferences = useCallback(async (preferences: DietaryPreferences) => {
    setDietaryPreferences(preferences);
    setLoading(true);
    
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const generatedPlan = await generateMealPlan({
        userData: {
          id: user?.id,
          weight: parseFloat(formData.weight),
          height: parseFloat(formData.height),
          age: parseFloat(formData.age),
          gender: formData.gender,
          activityLevel: formData.activityLevel,
          goal: formData.goal,
          dailyCalories: calorieNeeds
        },
        selectedFoods: protocolFoods.filter(food => selectedFoods.includes(food.id)),
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
  }, [formData, calorieNeeds, selectedFoods, protocolFoods, foodsByMealType, wallet]);

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

const activityLevels = [
  { value: "sedentary", multiplier: 1.2 },
  { value: "light", multiplier: 1.375 },
  { value: "moderate", multiplier: 1.55 },
  { value: "intense", multiplier: 1.725 }
];
