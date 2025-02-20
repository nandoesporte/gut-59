
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan } from "./types";
import { CalorieCalculatorForm, activityLevels } from "./CalorieCalculator";
import { useProtocolFoods } from "./hooks/useProtocolFoods";
import { useCalorieCalculator } from "./hooks/useCalorieCalculator";
import { useFoodSelection } from "./hooks/useFoodSelection";

export const useMenuController = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [formData, setFormData] = useState<CalorieCalculatorForm>({
    weight: "",
    height: "",
    age: "",
    gender: "male",
    activityLevel: "",
    goal: undefined,
  });

  const protocolFoods = useProtocolFoods();
  const { loading, calorieNeeds, calculateCalories } = useCalorieCalculator();
  const { selectedFoods, totalCalories, handleFoodSelection, calculateTotalCalories } = useFoodSelection();

  useEffect(() => {
    calculateTotalCalories(protocolFoods);
  }, [selectedFoods, protocolFoods]);

  const handleCalculateCalories = async () => {
    const selectedLevel = activityLevels.find(level => level.value === formData.activityLevel);
    if (!selectedLevel) {
      toast.error("Por favor, selecione um nível de atividade");
      return;
    }

    const calories = await calculateCalories(formData, selectedLevel);
    if (calories) {
      setCurrentStep(2);
    }
  };

  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {    
    const toastId = toast.loading("Gerando seu plano alimentar personalizado...");
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.dismiss(toastId);
        toast.error("Usuário não autenticado");
        return;
      }

      // Validações iniciais mais rigorosas
      if (!calorieNeeds || calorieNeeds <= 0) {
        toast.dismiss(toastId);
        toast.error("Necessidade calórica inválida");
        return;
      }

      if (!selectedFoods || selectedFoods.length === 0) {
        toast.dismiss(toastId);
        toast.error("Por favor, selecione pelo menos um alimento");
        return;
      }

      if (!formData.goal || !formData.weight || !formData.height || !formData.age) {
        toast.dismiss(toastId);
        toast.error("Por favor, preencha todos os dados do formulário");
        return;
      }

      // Salvar preferências alimentares
      const dietaryPreference = {
        user_id: userData.user.id,
        has_allergies: preferences.hasAllergies || false,
        allergies: preferences.allergies || [],
        dietary_restrictions: preferences.dietaryRestrictions || [],
        training_time: preferences.trainingTime || null
      };

      const { error: dietaryError } = await supabase
        .from('dietary_preferences')
        .upsert(dietaryPreference);

      if (dietaryError) {
        console.error('Error saving dietary preferences:', dietaryError);
        toast.dismiss(toastId);
        toast.error("Erro ao salvar preferências alimentares");
        return;
      }

      setDietaryPreferences(preferences);

      // Preparar e validar dados dos alimentos
      const selectedFoodsDetails = protocolFoods.filter(food => selectedFoods.includes(food.id));
      
      if (selectedFoodsDetails.length === 0) {
        toast.dismiss(toastId);
        toast.error("Erro ao processar alimentos selecionados");
        return;
      }

      const requestData = {
        userData: {
          weight: Number(formData.weight),
          height: Number(formData.height),
          age: Number(formData.age),
          gender: formData.gender,
          activityLevel: formData.activityLevel,
          goal: formData.goal,
          userId: userData.user.id,
          dailyCalories: calorieNeeds
        },
        selectedFoods: selectedFoodsDetails.map(food => ({
          id: food.id,
          name: food.name,
          calories: food.calories,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fats: food.fats || 0,
          portion: food.portion || 100,
          portionUnit: food.portionUnit || 'g'
        })),
        dietaryPreferences: {
          hasAllergies: preferences.hasAllergies || false,
          allergies: preferences.allergies || [],
          dietaryRestrictions: preferences.dietaryRestrictions || [],
          trainingTime: preferences.trainingTime || null
        }
      };

      // Gerar cardápio usando a edge function - Removendo headers problemáticos
      const { data: responseData, error: generateError } = await supabase.functions.invoke(
        'generate-meal-plan',
        {
          body: requestData
        }
      );

      if (generateError) {
        console.error('Erro na edge function:', generateError);
        throw new Error('Falha ao gerar cardápio');
      }

      if (!responseData || typeof responseData !== 'object') {
        throw new Error('Dados inválidos recebidos do gerador de cardápio');
      }

      // Salvar cardápio gerado
      const { error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.user.id,
          plan_data: responseData,
          calories: calorieNeeds,
          active: true,
          dietary_preferences: JSON.stringify(preferences)
        });

      if (saveError) {
        console.error('Erro ao salvar cardápio:', saveError);
        throw new Error('Falha ao salvar cardápio');
      }

      setMealPlan(responseData);
      setCurrentStep(4);
      toast.dismiss(toastId);
      toast.success("Cardápio personalizado gerado com sucesso!");

    } catch (error) {
      console.error('Erro completo:', error);
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar cardápio. Por favor, tente novamente.");
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
