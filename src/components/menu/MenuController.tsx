
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan } from "./types";
import { CalorieCalculatorForm, activityLevels } from "./CalorieCalculator";
import { useProtocolFoods } from "./hooks/useProtocolFoods";
import { useCalorieCalculator } from "./hooks/useCalorieCalculator";
import { useFoodSelection } from "./hooks/useFoodSelection";
import { useWallet } from "@/hooks/useWallet";
import { REWARDS } from '@/constants/rewards';

export const useMenuController = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
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

  const protocolFoods = useProtocolFoods();
  const { calorieNeeds, calculateCalories } = useCalorieCalculator();
  const { selectedFoods, totalCalories, handleFoodSelection, calculateTotalCalories } = useFoodSelection();
  const { addTransaction } = useWallet();

  useEffect(() => {
    calculateTotalCalories(protocolFoods);
  }, [selectedFoods, protocolFoods]);

  const handleCalculateCalories = async () => {
    const selectedLevel = activityLevels.find(level => level.value === formData.activityLevel);
    if (!selectedLevel) {
      toast.error("Por favor, selecione um nível de atividade");
      return false;
    }

    try {
      const calories = await calculateCalories(formData, selectedLevel);
      return calories !== null;
    } catch (error) {
      console.error('Erro ao calcular calorias:', error);
      toast.error("Erro ao calcular as calorias necessárias");
      return false;
    }
  };

  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {    
    // Validações iniciais
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Usuário não autenticado");
      return false;
    }

    if (!calorieNeeds || calorieNeeds <= 0) {
      toast.error("Necessidade calórica inválida");
      return false;
    }

    if (!selectedFoods || selectedFoods.length === 0) {
      toast.error("Selecione pelo menos um alimento");
      return false;
    }

    if (!formData.goal || !formData.weight || !formData.height || !formData.age) {
      toast.error("Dados do formulário incompletos");
      return false;
    }

    let toastId: string | number | undefined;
    
    try {
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

      // Só mostra loading depois de preparar os dados
      setLoading(true);
      toastId = toast.loading("Gerando seu plano alimentar personalizado...");

      const { data: generatedPlan, error: generateError } = await supabase.functions.invoke(
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
            dietaryPreferences: preferences
          }
        }
      );

      if (generateError) {
        console.error('Erro na edge function:', generateError);
        toast.dismiss(toastId);
        toast.error(generateError.message || 'Falha ao gerar cardápio');
        return false;
      }

      if (!generatedPlan?.mealPlan) {
        toast.dismiss(toastId);
        toast.error('Plano alimentar não gerado corretamente');
        return false;
      }

      await addTransaction({
        amount: REWARDS.MEAL_PLAN,
        type: 'meal_plan',
        description: 'Geração de plano alimentar'
      });
      
      setMealPlan(generatedPlan.mealPlan);
      setDietaryPreferences(preferences);

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
        console.error('Erro ao salvar preferências:', dietaryError);
      }

      const { error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.user.id,
          plan_data: generatedPlan.mealPlan,
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
      }

      toast.dismiss(toastId);
      toast.success(`Cardápio personalizado gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);
      return true;

    } catch (error) {
      console.error('Erro completo:', error);
      if (toastId) toast.dismiss(toastId);
      toast.error("Erro ao gerar o plano alimentar. Tente novamente.");
      return false;
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
