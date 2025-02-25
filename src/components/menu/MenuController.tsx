
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan } from "./types";
import { CalorieCalculatorForm, activityLevels } from "./CalorieCalculator";
import { useProtocolFoods } from "./hooks/useProtocolFoods";
import { useCalorieCalculator } from "./hooks/useCalorieCalculator";
import { useFoodSelection } from "./hooks/useFoodSelection";
import { useWallet } from "@/hooks/useWallet";
import { generateMealPlan } from "./hooks/useMealPlanGeneration";

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
  const wallet = useWallet();

  const addTransactionAsync = async (params: Parameters<typeof wallet.addTransaction>[0]) => {
    return new Promise<void>((resolve, reject) => {
      try {
        wallet.addTransaction(params);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

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
      if (calories) {
        toast.success("Calorias calculadas com sucesso!");
        setCurrentStep(2);
      }
      return calories !== null;
    } catch (error) {
      console.error('Erro ao calcular calorias:', error);
      toast.error("Erro ao calcular as calorias necessárias");
      return false;
    }
  };

  const saveMealPlanToDatabase = async (generatedMealPlan: MealPlan) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const insertData = [{
        plan_data: JSON.parse(JSON.stringify(generatedMealPlan)),
        active: true,
        calories: calorieNeeds || 0,
        dietary_preferences: dietaryPreferences ? JSON.parse(JSON.stringify(dietaryPreferences)) : null,
        user_id: user.id,
        training_time: dietaryPreferences?.trainingTime || null,
        macros: null
      }];

      const { error } = await supabase
        .from('meal_plans')
        .insert(insertData);

      if (error) throw error;

      toast.success('Plano alimentar salvo com sucesso!');
    } catch (error) {
      console.error('Error saving meal plan:', error);
      toast.error('Erro ao salvar o plano alimentar');
      throw error;
    }
  };

  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {    
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

    console.log('Preferências alimentares recebidas:', preferences);
    console.log('Alimentos selecionados:', selectedFoods);

    setLoading(true);

    try {
      const selectedFoodsData = protocolFoods.filter(food => selectedFoods.includes(food.id));
      console.log('Dados dos alimentos selecionados:', selectedFoodsData);

      const { data: existingPreferences, error: preferencesError } = await supabase
        .from('dietary_preferences')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        console.error('Erro ao verificar preferências existentes:', preferencesError);
      }

      console.log('Preferências existentes:', existingPreferences);
      
      const generatedMealPlan = await generateMealPlan({
        userData: {
          id: userData.user.id,
          weight: Number(formData.weight),
          height: Number(formData.height),
          age: Number(formData.age),
          gender: formData.gender,
          activityLevel: formData.activityLevel,
          goal: formData.goal,
          dailyCalories: calorieNeeds
        },
        selectedFoods: selectedFoodsData,
        preferences,
        addTransaction: addTransactionAsync
      });

      if (!generatedMealPlan) {
        throw new Error('Plano alimentar não foi gerado corretamente');
      }

      await saveMealPlanToDatabase(generatedMealPlan);

      console.log('Plano gerado:', generatedMealPlan);
      setMealPlan(generatedMealPlan);
      setDietaryPreferences(preferences);
      setCurrentStep(4);
      return true;

    } catch (error) {
      console.error('Erro completo:', error);
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
