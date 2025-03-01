import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { DietaryPreferences, MealPlan } from "./types";
import { CalorieCalculatorForm, activityLevels } from "./CalorieCalculator";
import { useProtocolFoods } from "./hooks/useProtocolFoods";
import { useCalorieCalculator } from "./hooks/useCalorieCalculator";
import { useFoodSelection } from "./hooks/useFoodSelection";
import { useMenuDatabase } from "./hooks/useMenuDatabase";
import { useMealPlanManager } from "./hooks/useMealPlanManager";

export const useMenuController = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences | null>(null);
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
  const { selectedFoods, foodsByMealType, totalCalories, handleFoodSelection, calculateTotalCalories, categorizeFoodsByMealType } = useFoodSelection();
  const menuDatabase = useMenuDatabase();
  const { mealPlan, loading, generateUserMealPlan, regenerateMealPlan, setMealPlan } = useMealPlanManager();

  useEffect(() => {
    calculateTotalCalories(protocolFoods);
  }, [selectedFoods, protocolFoods, calculateTotalCalories]);

  useEffect(() => {
    const loadSavedPreferences = async () => {
      try {
        const savedFoods = await menuDatabase.loadSavedFoodPreferences();
        
        if (savedFoods && Array.isArray(savedFoods)) {
          savedFoods.forEach(foodId => {
            if (typeof foodId === 'string' && !selectedFoods.includes(foodId)) {
              handleFoodSelection(foodId);
            }
          });
          
          if (savedFoods.length > 0) {
            categorizeFoodsByMealType(protocolFoods);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar preferências alimentares:', error);
        // Don't show toast here as it might be annoying on every load
      }
    };

    if (protocolFoods.length > 0) {
      loadSavedPreferences();
    }
  }, [protocolFoods, selectedFoods, handleFoodSelection, categorizeFoodsByMealType, menuDatabase]);

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
        
        try {
          await menuDatabase.saveCalorieCalculation(formData, calories, selectedFoods);
        } catch (dbError) {
          console.error('Erro ao salvar cálculo de calorias:', dbError);
        }
        
        setCurrentStep(2);
        console.log("Avançando para a etapa 2 (seleção de alimentos)");
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao calcular calorias:', error);
      toast.error("Erro ao calcular as calorias necessárias");
      return false;
    }
  };

  const handleConfirmFoodSelection = async () => {
    console.log("Iniciando confirmação de seleção de alimentos");
    
    if (selectedFoods.length === 0) {
      console.warn("Nenhum alimento selecionado!");
      toast.error("Por favor, selecione pelo menos um alimento antes de prosseguir");
      return false;
    }
    
    toast.success("Processando sua seleção de alimentos...");
    
    try {
      await menuDatabase.saveFoodSelection(selectedFoods, formData);
      setCurrentStep(3);
      toast.success("Preferências de alimentos salvas! Agora informe suas restrições dietéticas.");
      return true;
    } catch (error) {
      console.error("Erro ao salvar seleção de alimentos:", error);
      toast.error("Ocorreu um erro ao salvar suas preferências de alimentos");
      setCurrentStep(3);
      return true;
    }
  };

  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {
    try {
      console.log("Iniciando geração do plano alimentar com preferências:", preferences);
      console.log("Dados do formulário:", formData);
      console.log("Alimentos selecionados:", selectedFoods);
      console.log("Distribuição por refeição:", foodsByMealType);
      
      const result = await generateUserMealPlan({
        formData,
        calorieNeeds,
        selectedFoods,
        foodsByMealType,
        protocolFoods,
        preferences
      });
      
      console.log("Resultado da geração do plano:", result);
      
      if (result && result.weeklyPlan) {
        console.log("Plano alimentar gerado com sucesso!");
        console.log("Estrutura do plano:", {
          temRefeicoes: !!result.weeklyPlan.monday?.meals,
          temTotais: !!result.weeklyPlan.monday?.dailyTotals,
          temRecomendacoes: !!result.recommendations
        });
        
        setDietaryPreferences(preferences);
        setCurrentStep(4);
        return true;
      } else {
        console.error("Plano gerado sem estrutura válida:", result);
        toast.error("O plano gerado não possui a estrutura esperada. Tentando novamente...");
        return false;
      }
    } catch (error) {
      console.error("Erro detalhado ao gerar plano:", error);
      toast.error("Ocorreu um erro ao gerar seu plano alimentar. Por favor, tente novamente.");
      return false;
    }
  };

  const handleRegenerateMealPlan = async () => {
    try {
      toast.info("Gerando novo plano alimentar...");
      console.log("Iniciando regeneração do plano com:", {
        formData,
        calorieNeeds,
        foodsByMealType
      });
      
      const success = await regenerateMealPlan(
        formData, 
        calorieNeeds,
        protocolFoods,
        foodsByMealType
      );
      
      if (!success) {
        throw new Error("Falha ao regenerar o plano alimentar");
      }
      
      return success;
    } catch (error) {
      console.error('Erro detalhado ao atualizar cardápio:', error);
      toast.error("Erro ao atualizar o cardápio. Tente novamente.");
      throw error;
    }
  };

  useEffect(() => {
    if (mealPlan) {
      console.log("DETALHES DO PLANO ALIMENTAR:", {
        possuiPlanoSemanal: !!mealPlan.weeklyPlan,
        diasDisponiveis: mealPlan.weeklyPlan ? Object.keys(mealPlan.weeklyPlan) : [],
        possuiRecomendacoes: !!mealPlan.recommendations,
        possuiTotaisSemanais: !!mealPlan.weeklyTotals,
        primeiroDia: mealPlan.weeklyPlan?.monday ? {
          possuiRefeicoes: !!mealPlan.weeklyPlan.monday.meals,
          numeroRefeicoes: Object.keys(mealPlan.weeklyPlan.monday.meals || {}).length,
          possuiTotaisDiarios: !!mealPlan.weeklyPlan.monday.dailyTotals
        } : null
      });
    }
  }, [mealPlan]);

  return {
    currentStep,
    setCurrentStep,
    calorieNeeds,
    selectedFoods,
    foodsByMealType,
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
    regenerateMealPlan: handleRegenerateMealPlan,
  };
};
