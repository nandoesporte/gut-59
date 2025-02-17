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
    weight: "",
    height: "",
    age: "",
    gender: "male",
    activityLevel: "",
  });

  useEffect(() => {
    const fetchProtocolFoods = async () => {
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('*')
        .in('food_group_id', [1, 2, 3, 4]);

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
    const weight = parseFloat(data.weight);
    const height = parseFloat(data.height);
    const age = parseFloat(data.age);

    if (data.gender === "male") {
      return 88.36 + (13.4 * weight) + (4.8 * height) - (5.7 * age);
    } else {
      return 447.6 + (9.2 * weight) + (3.1 * height) - (4.3 * age);
    }
  };

  const handleCalculateCalories = () => {
    setLoading(true);
    
    // Simulate calculation delay
    setTimeout(() => {
      const bmr = calculateBMR(formData);
      const selectedLevel = activityLevels.find(level => level.value === formData.activityLevel);
      const activityMultiplier = selectedLevel ? selectedLevel.multiplier : 1.2;
      const dailyCalories = Math.round(bmr * activityMultiplier);

      setCalorieNeeds(dailyCalories);
      setLoading(false);
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
      toast.loading("Gerando seu plano alimentar personalizado...");

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

      // Garantir que todos os campos necessários estão presentes
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

      // Log da requisição para debug
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
