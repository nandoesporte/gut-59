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
    goal: undefined,
  });

  useEffect(() => {
    const fetchProtocolFoods = async () => {
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('*');

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
    
    try {
      const bmr = calculateBMR(formData);
      const selectedLevel = activityLevels.find(level => level.value === formData.activityLevel);
      const activityMultiplier = selectedLevel ? selectedLevel.multiplier : 1.2;
      const dailyCalories = Math.round(bmr * activityMultiplier);

      console.log('Calculated calories:', dailyCalories);

      setCalorieNeeds(dailyCalories);
      setCurrentStep(2);
    } catch (error) {
      console.error('Error calculating calories:', error);
      toast.error("Erro ao calcular necessidades calóricas");
    } finally {
      setLoading(false);
    }
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

      if (!formData.goal) {
        toast.error("Objetivo não selecionado");
        return;
      }

      setDietaryPreferences(preferences);

      const requestData = {
        userData: {
          weight: parseFloat(formData.weight),
          height: parseFloat(formData.height),
          age: parseFloat(formData.age),
          gender: formData.gender,
          activityLevel: formData.activityLevel,
          goal: formData.goal,
          userId: userData.user.id,
          dailyCalories: calorieNeeds
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

      // Show loading toast
      const toastId = toast.loading("Gerando seu plano alimentar personalizado...");

      const { data: responseData, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: requestData
      });

      if (error) {
        console.error('Erro da função edge:', error);
        toast.dismiss(toastId);
        toast.error("Erro ao gerar cardápio. Por favor, tente novamente.");
        return;
      }

      if (!responseData) {
        toast.dismiss(toastId);
        throw new Error('Nenhum dado recebido do gerador de cardápio');
      }

      // Salvar o plano no banco de dados
      const { error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.user.id,
          plan_data: responseData,
          calories: calorieNeeds,
          active: true
        });

      if (saveError) {
        console.error('Erro ao salvar plano:', saveError);
        toast.error("Erro ao salvar o plano alimentar");
        return;
      }

      console.log('Cardápio recebido:', responseData);
      setMealPlan(responseData);
      setCurrentStep(4);
      toast.dismiss(toastId);
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
