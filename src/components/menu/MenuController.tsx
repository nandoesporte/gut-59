
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan, NutritionPreference } from "./types";
import { CalorieCalculatorForm, activityLevels } from "./CalorieCalculator";
import { useProtocolFoods } from "./hooks/useProtocolFoods";
import { useCalorieCalculator } from "./hooks/useCalorieCalculator";
import { useFoodSelection } from "./hooks/useFoodSelection";
import { useWallet } from "@/hooks/useWallet";
import { REWARDS } from '@/constants/rewards';
import { Database } from "@/integrations/supabase/types";

type ActivityLevel = Database["public"]["Enums"]["activity_level"];

export const useMenuController = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoadingDialog, setShowLoadingDialog] = useState(false);
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
    if (!formData.weight || !formData.height || !formData.age || !formData.goal) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return false;
    }

    const selectedLevel = activityLevels.find(level => level.value === formData.activityLevel);
    if (!selectedLevel) {
      toast.error("Por favor, selecione um nível de atividade");
      return false;
    }

    try {
      const calories = await calculateCalories(formData, selectedLevel);
      if (calories !== null) {
        await saveFoodSelection(); // Salva as informações iniciais
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao calcular calorias:', error);
      toast.error("Erro ao calcular as calorias necessárias");
      return false;
    }
  };

  const saveFoodSelection = async () => {
    try {
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

      // Converte o activity_level para o tipo correto
      const activityLevel = formData.activityLevel as ActivityLevel;
      
      const nutritionPreference: NutritionPreference = {
        user_id: userData.user.id,
        activity_level: activityLevel,
        age: Number(formData.age),
        gender: formData.gender,
        goal: formData.goal === "lose" ? "lose_weight" : formData.goal === "gain" ? "gain_mass" : "maintain",
        height: Number(formData.height),
        weight: Number(formData.weight),
        calories_needed: calorieNeeds,
        updated_at: new Date().toISOString(),
        selected_foods: selectedFoods
      };

      const { error } = await supabase
        .from('nutrition_preferences')
        .upsert(nutritionPreference);

      if (error) {
        console.error('Erro ao salvar seleção de alimentos:', error);
        toast.error("Erro ao salvar sua seleção de alimentos");
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao salvar seleção de alimentos:', error);
      toast.error("Erro ao processar sua seleção");
      return false;
    }
  };

  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {    
    setShowLoadingDialog(true);
    setLoading(true);
    
    try {
      console.log("Iniciando geração do plano alimentar...");
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.error('Usuário não autenticado');
        setShowLoadingDialog(false);
        toast.error("Usuário não autenticado");
        return false;
      }

      console.log("Buscando preferências nutricionais do usuário...");
      const { data: existingPreferences, error: preferencesError } = await supabase
        .from('nutrition_preferences')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();

      if (preferencesError) {
        console.error('Erro ao buscar preferências:', preferencesError);
        toast.error("Erro ao buscar suas preferências");
        return false;
      }

      if (!existingPreferences) {
        console.error('Preferências não encontradas');
        toast.error("Por favor, complete as etapas anteriores primeiro");
        return false;
      }

      console.log("Salvando preferências dietéticas...");
      const { error: updateError } = await supabase
        .from('dietary_preferences')
        .upsert({
          user_id: userData.user.id,
          has_allergies: preferences.hasAllergies,
          allergies: preferences.allergies,
          dietary_restrictions: preferences.dietaryRestrictions,
          training_time: preferences.trainingTime,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Erro ao salvar preferências:', updateError);
        toast.error("Erro ao salvar preferências");
        return false;
      }

      console.log("Buscando prompt do agente...");
      const { data: agentPrompt, error: promptError } = await supabase
        .from('ai_agent_prompts')
        .select('prompt')
        .eq('agent_type', 'meal_plan')
        .eq('is_active', true)
        .single();

      if (promptError || !agentPrompt) {
        console.error('Erro ao buscar prompt do agente:', promptError);
        toast.error("Erro ao carregar configurações do agente nutricional");
        return false;
      }

      // Preparar dados para a geração do plano
      console.log("Preparando dados dos alimentos selecionados...");
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

      console.log("Preparando payload para a edge function...");
      const payload = {
        userData: {
          weight: Number(formData.weight),
          height: Number(formData.height),
          age: Number(formData.age),
          gender: formData.gender,
          activityLevel: formData.activityLevel,
          goal: formData.goal === "lose" ? "lose_weight" : formData.goal === "gain" ? "gain_mass" : "maintain",
          userId: userData.user.id,
          dailyCalories: calorieNeeds
        },
        selectedFoods: selectedFoodsDetails,
        dietaryPreferences: preferences,
        agentPrompt: agentPrompt.prompt
      };

      console.log("Dados sendo enviados para a edge function:", JSON.stringify(payload, null, 2));
      
      console.log("Chamando edge function generate-meal-plan...");
      const { data: response, error: planError } = await supabase.functions.invoke(
        'generate-meal-plan',
        {
          body: payload
        }
      );

      if (planError) {
        console.error('Erro ao gerar plano:', planError);
        toast.error("Erro ao gerar plano alimentar. Tente novamente.");
        return false;
      }

      console.log("Resposta da edge function:", JSON.stringify(response, null, 2));

      if (!response?.mealPlan) {
        console.error('Plano alimentar não gerado corretamente');
        toast.error('Plano alimentar não gerado corretamente');
        return false;
      }

      console.log("Salvando plano gerado...");
      setMealPlan(response.mealPlan);
      setDietaryPreferences(preferences);

      // Adicionar transação de FITs
      if (response?.mealPlan) {
        await addTransaction({
          amount: REWARDS.MEAL_PLAN,
          type: 'meal_plan',
          description: 'Geração de plano alimentar'
        });
        
        console.log("FITs adicionados com sucesso");
        toast.success(`Cardápio personalizado gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);
      }

      // Salvar plano gerado
      const { error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.user.id,
          plan_data: response.mealPlan,
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
        // Não retornamos false aqui pois o plano já foi gerado com sucesso
      }

      setCurrentStep(4);
      return true;

    } catch (error) {
      console.error('Erro completo:', error);
      toast.error("Erro ao gerar o plano alimentar. Tente novamente.");
      return false;
    } finally {
      setLoading(false);
      setShowLoadingDialog(false);
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
    showLoadingDialog,
    handleCalculateCalories,
    handleFoodSelection,
    handleDietaryPreferences,
    setFormData,
    saveFoodSelection,
  };
};
