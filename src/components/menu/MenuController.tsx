
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ProtocolFood, DietaryPreferences, MealPlan } from "./types";
import { CalorieCalculatorForm, activityLevels } from "./CalorieCalculator";

export const useMenuController = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
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

  useEffect(() => {
    const fetchProtocolFoods = async () => {
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('*, food_groups!fk_food_group(name)');

      if (error) {
        console.error('Error fetching foods:', error);
        toast.error("Erro ao carregar lista de alimentos");
        return;
      }

      setProtocolFoods(data);
    };

    fetchProtocolFoods();
  }, []);

  useEffect(() => {
    const calculateTotalCalories = () => {
      const total = protocolFoods
        .filter(food => selectedFoods.includes(food.id))
        .reduce((sum, food) => sum + food.calories, 0);
      setTotalCalories(total);
    };

    calculateTotalCalories();
  }, [selectedFoods, protocolFoods]);

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

      setCalorieNeeds(dailyCalories);
      setLoading(false);
      toast.success("Cálculo concluído!");
      setCurrentStep(2);
    }, 1500);
  };

  const handleFoodSelection = (foodId: string) => {
    setSelectedFoods(prev => {
      if (prev.includes(foodId)) {
        return prev.filter(id => id !== foodId);
      }
      if (prev.length >= 20) {
        toast.error("Você já selecionou o máximo de 20 alimentos!");
        return prev;
      }
      return [...prev, foodId];
    });
  };

  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {
    try {
      setLoading(true);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Usuário não autenticado");
        return;
      }

      if (!calorieNeeds) {
        toast.error("Necessidade calórica não calculada");
        return;
      }

      if (selectedFoods.length === 0) {
        toast.error("Nenhum alimento selecionado");
        return;
      }

      setDietaryPreferences(preferences);

      const requestData = {
        userData: {
          ...formData,
          userId: userData.user.id,
          dailyCalories: calorieNeeds,
          lastFeedback: {
            likedFoods: [],
            dislikedFoods: []
          }
        },
        selectedFoods,
        dietaryPreferences: {
          ...preferences,
          hasAllergies: preferences.hasAllergies || false,
          allergies: preferences.allergies || [],
          dietaryRestrictions: preferences.dietaryRestrictions || [],
          trainingTime: preferences.trainingTime || null
        }
      };

      console.log('Enviando requisição:', JSON.stringify(requestData, null, 2));

      const { data: responseData, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: requestData
      });

      if (error) {
        console.error('Erro da função edge:', error);
        toast.error("Erro ao gerar cardápio. Por favor, tente novamente.");
        throw error;
      }

      if (!responseData) {
        throw new Error('Nenhum dado recebido do gerador de cardápio');
      }

      const dietaryPreferencesJson = {
        hasAllergies: preferences.hasAllergies || false,
        allergies: preferences.allergies || [],
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        trainingTime: preferences.trainingTime || null
      };

      const { error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.user.id,
          dietary_preferences: dietaryPreferencesJson,
          calories: calorieNeeds,
          plan_data: responseData,
          macros: responseData.totalNutrition,
          training_time: preferences.trainingTime,
          active: true
        });

      if (saveError) {
        console.error('Erro ao salvar plano:', saveError);
        toast.error("Erro ao salvar seu plano alimentar");
        throw saveError;
      }

      console.log('Cardápio recebido:', responseData);
      setMealPlan(responseData);
      setCurrentStep(4);
      toast.success("Cardápio personalizado gerado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar cardápio:', error);
      toast.error("Erro ao gerar cardápio personalizado. Por favor, tente novamente.");
    } finally {
      setLoading(false);
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
    loading,
    handleCalculateCalories,
    handleFoodSelection,
    handleDietaryPreferences,
    setFormData,
  };
};
