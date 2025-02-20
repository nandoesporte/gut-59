
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

      // Validações iniciais
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

      // Preparar dados dos alimentos
      const selectedFoodsDetails = protocolFoods.filter(food => selectedFoods.includes(food.id));
      
      if (selectedFoodsDetails.length === 0) {
        toast.dismiss(toastId);
        toast.error("Erro ao processar alimentos selecionados");
        return;
      }

      console.log('Calling edge function with:', {
        userData,
        selectedFoodsDetails,
        dietaryPreference
      });

      // Chamar a edge function para gerar o plano alimentar
      const { data: mealPlanData, error: generateError } = await supabase.functions.invoke(
        'generate-meal-plan',
        {
          body: {
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
          }
        }
      );

      console.log('Edge function response:', mealPlanData);

      if (generateError) {
        console.error('Erro na edge function:', generateError);
        throw new Error(generateError.message || 'Falha ao gerar cardápio');
      }

      if (!mealPlanData) {
        throw new Error('Nenhum dado recebido do gerador de cardápio');
      }

      // Validate meal plan data structure
      if (!mealPlanData.dailyPlan || !mealPlanData.totalNutrition || !mealPlanData.recommendations) {
        console.error('Invalid meal plan structure:', mealPlanData);
        throw new Error('Estrutura inválida do plano alimentar');
      }

      // Set the meal plan state first
      setMealPlan(mealPlanData);

      // Then save to the database
      const { error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.user.id,
          plan_data: mealPlanData,
          calories: calorieNeeds,
          active: true,
          dietary_preferences: dietaryPreference
        });

      if (saveError) {
        console.error('Erro ao salvar cardápio:', saveError);
        throw new Error('Falha ao salvar cardápio');
      }

      // Only change step after meal plan is set and saved
      setCurrentStep(4);
      toast.dismiss(toastId);
      toast.success("Cardápio personalizado gerado com sucesso!");

    } catch (error) {
      console.error('Erro completo:', error);
      toast.dismiss(toastId);
      const errorMessage = error instanceof Error ? error.message : "Erro ao gerar cardápio";
      toast.error(errorMessage);
      
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
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
