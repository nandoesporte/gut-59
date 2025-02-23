
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

      // Preparar dados dos alimentos
      const selectedFoodsDetails = protocolFoods
        .filter(food => selectedFoods.includes(food.id))
        .map(food => ({
          id: food.id,
          name: food.name,
          calories: food.calories,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fats: food.fats || 0,
          portion: food.portion || 100,
          portionUnit: food.portionUnit || 'g',
          food_group_id: food.food_group_id
        }));

      if (selectedFoodsDetails.length === 0) {
        toast.dismiss(toastId);
        toast.error("Erro ao processar alimentos selecionados");
        return;
      }

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
              goal: formData.goal === "lose" ? "lose_weight" : formData.goal === "gain" ? "gain_weight" : "maintain",
              userId: userData.user.id,
              dailyCalories: calorieNeeds
            },
            selectedFoods: selectedFoodsDetails,
            dietaryPreferences: {
              hasAllergies: preferences.hasAllergies || false,
              allergies: preferences.allergies || [],
              dietaryRestrictions: preferences.dietaryRestrictions || [],
              trainingTime: preferences.trainingTime || null
            }
          }
        }
      );

      if (generateError) {
        console.error('Erro na edge function:', generateError);
        throw new Error(generateError.message || 'Falha ao gerar cardápio');
      }

      if (!mealPlanData || !mealPlanData.weeklyPlan || !mealPlanData.totalNutrition) {
        console.error('Dados do plano recebidos:', mealPlanData);
        throw new Error('Estrutura inválida do plano alimentar recebido');
      }

      // Transformar o plano semanal em plano diário para compatibilidade
      const dailyPlan = {
        breakfast: mealPlanData.weeklyPlan.Segunda.breakfast,
        morningSnack: mealPlanData.weeklyPlan.Segunda.morningSnack,
        lunch: mealPlanData.weeklyPlan.Segunda.lunch,
        afternoonSnack: mealPlanData.weeklyPlan.Segunda.afternoonSnack,
        dinner: mealPlanData.weeklyPlan.Segunda.dinner
      };

      const formattedMealPlan = {
        dailyPlan,
        totalNutrition: mealPlanData.totalNutrition,
        recommendations: mealPlanData.recommendations || {
          general: "Mantenha-se hidratado e tente seguir os horários sugeridos.",
          preworkout: "Consuma carboidratos complexos 2-3 horas antes do treino.",
          postworkout: "Priorize proteínas e carboidratos após o treino.",
          timing: [
            "Café da manhã: 7:00-8:00",
            "Lanche da manhã: 10:00-10:30",
            "Almoço: 12:00-13:00",
            "Lanche da tarde: 15:00-15:30",
            "Jantar: 19:00-20:00"
          ]
        }
      };

      // Set the meal plan state first
      setMealPlan(formattedMealPlan);

      // Save dietary preferences
      const { error: dietaryError } = await supabase
        .from('dietary_preferences')
        .upsert({
          user_id: userData.user.id,
          has_allergies: preferences.hasAllergies || false,
          allergies: preferences.allergies || [],
          dietary_restrictions: preferences.dietaryRestrictions || [],
          training_time: preferences.trainingTime || null
        });

      if (dietaryError) {
        console.error('Erro ao salvar preferências alimentares:', dietaryError);
        throw new Error('Falha ao salvar preferências alimentares');
      }

      setDietaryPreferences(preferences);

      // Save the meal plan to the database
      const { error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.user.id,
          plan_data: formattedMealPlan,
          calories: calorieNeeds,
          dietary_preferences: {
            hasAllergies: preferences.hasAllergies || false,
            allergies: preferences.allergies || [],
            dietaryRestrictions: preferences.dietaryRestrictions || [],
            training_time: preferences.trainingTime || null
          }
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
