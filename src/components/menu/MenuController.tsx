
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

  // Create a Promise-wrapped version of addTransaction
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

  // Carregar preferências de alimentos salvos anteriormente
  useEffect(() => {
    const loadSavedPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: nutritionPrefs, error } = await supabase
          .from('nutrition_preferences')
          .select('selected_foods')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar preferências alimentares:', error);
          return;
        }

        if (nutritionPrefs?.selected_foods && Array.isArray(nutritionPrefs.selected_foods)) {
          // Restaurar alimentos selecionados da última vez
          nutritionPrefs.selected_foods.forEach(foodId => {
            if (typeof foodId === 'string' && !selectedFoods.includes(foodId)) {
              handleFoodSelection(foodId);
            }
          });
        }
      } catch (err) {
        console.error('Erro ao carregar preferências:', err);
      }
    };

    loadSavedPreferences();
  }, []);

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
        
        // Também salvar os dados básicos do usuário
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase.from('nutrition_preferences').upsert({
            user_id: user.id,
            weight: Number(formData.weight),
            height: Number(formData.height),
            age: Number(formData.age),
            gender: formData.gender,
            activity_level: formData.activityLevel,
            goal: formData.goal,
            calories_needed: calories
          }, { onConflict: 'user_id' });

          if (error) {
            console.error('Erro ao salvar preferências nutricionais:', error);
          }
        }
        
        setCurrentStep(2);
      }
      return calories !== null;
    } catch (error) {
      console.error('Erro ao calcular calorias:', error);
      toast.error("Erro ao calcular as calorias necessárias");
      return false;
    }
  };

  const handleConfirmFoodSelection = async () => {
    // Salvar seleção de alimentos na tabela
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return false;
      }

      // Atualizar o registro existente ou criar um novo com a seleção de alimentos
      const { error } = await supabase.from('nutrition_preferences').upsert({
        user_id: user.id,
        selected_foods: selectedFoods
      }, { onConflict: 'user_id' });

      if (error) {
        console.error('Erro ao salvar preferências de alimentos:', error);
        toast.error("Erro ao salvar preferências de alimentos");
        return false;
      }

      toast.success("Preferências de alimentos salvas com sucesso!");
      setCurrentStep(3);
      return true;
    } catch (error) {
      console.error('Erro ao salvar preferências de alimentos:', error);
      toast.error("Erro ao salvar preferências de alimentos");
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

    console.log('Preferências alimentares recebidas:', preferences);
    console.log('Alimentos selecionados:', selectedFoods);

    setLoading(true);

    try {
      const selectedFoodsData = protocolFoods.filter(food => selectedFoods.includes(food.id));
      console.log('Dados dos alimentos selecionados:', selectedFoodsData);

      // Salvar preferências dietéticas na tabela
      const { error: prefsError } = await supabase.from('dietary_preferences').upsert({
        user_id: userData.user.id,
        has_allergies: preferences.hasAllergies,
        allergies: preferences.allergies,
        dietary_restrictions: preferences.dietaryRestrictions,
        training_time: preferences.trainingTime
      }, { onConflict: 'user_id' });

      if (prefsError) {
        console.error('Erro ao salvar preferências dietéticas:', prefsError);
      }
      
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
    handleConfirmFoodSelection,
    handleDietaryPreferences,
    setFormData,
  };
};
