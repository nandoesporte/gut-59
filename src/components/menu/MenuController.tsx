
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan, ProtocolFood } from "./types";
import { CalorieCalculatorForm, activityLevels } from "./CalorieCalculator";
import { useProtocolFoods } from "./hooks/useProtocolFoods";
import { useCalorieCalculator } from "./hooks/useCalorieCalculator";
import { useFoodSelection } from "./hooks/useFoodSelection";
import { useWallet } from "@/hooks/useWallet";
import { generateMealPlan } from "./hooks/useMealPlanGeneration";

const mapGoalToDbValue = (goal: string | undefined): "maintain" | "lose_weight" | "gain_mass" => {
  if (!goal) return "maintain";
  
  switch (goal) {
    case "lose":
      return "lose_weight";
    case "gain":
      return "gain_mass";
    case "maintain":
      return "maintain";
    default:
      return "maintain";
  }
};

interface NutritionPreferences {
  id?: string;
  selected_foods?: string[];
  food_by_meal_type?: Record<string, string[]>;
}

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
  const { selectedFoods, foodsByMealType, totalCalories, handleFoodSelection, calculateTotalCalories, categorizeFoodsByMealType } = useFoodSelection();
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
  }, [selectedFoods, protocolFoods, calculateTotalCalories]);

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
          nutritionPrefs.selected_foods.forEach(foodId => {
            if (typeof foodId === 'string' && !selectedFoods.includes(foodId)) {
              handleFoodSelection(foodId);
            }
          });
          
          if (nutritionPrefs.selected_foods.length > 0) {
            categorizeFoodsByMealType(protocolFoods);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar preferências:', err);
      }
    };

    if (protocolFoods.length > 0) {
      loadSavedPreferences();
    }
  }, [protocolFoods, selectedFoods, handleFoodSelection, categorizeFoodsByMealType]);

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
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log("Salvando preferências para o usuário:", user.id);
          console.log("Dados do formulário:", formData);
          
          const activityLevel = formData.activityLevel as "sedentary" | "light" | "moderate" | "intense";
          const goal = mapGoalToDbValue(formData.goal);
          
          console.log("Mapeamento de objetivo:", formData.goal, "->", goal);
          
          const { data: existingRecord, error: selectError } = await supabase
            .from('nutrition_preferences')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (selectError) {
            console.error('Erro ao verificar preferências existentes:', selectError);
          }
          
          if (existingRecord) {
            console.log("Atualizando registro existente:", existingRecord.id);
            const { error } = await supabase
              .from('nutrition_preferences')
              .update({
                weight: Number(formData.weight),
                height: Number(formData.height),
                age: Number(formData.age),
                gender: formData.gender,
                activity_level: activityLevel,
                goal: goal,
                calories_needed: calories,
                selected_foods: selectedFoods
              })
              .eq('id', existingRecord.id);
            
            if (error) {
              console.error('Erro ao atualizar preferências nutricionais:', error);
            } else {
              console.log("Preferências atualizadas com sucesso");
            }
          } else {
            console.log("Criando novo registro de preferências");
            const { error } = await supabase
              .from('nutrition_preferences')
              .insert({
                user_id: user.id,
                weight: Number(formData.weight),
                height: Number(formData.height),
                age: Number(formData.age),
                gender: formData.gender,
                activity_level: activityLevel,
                goal: goal,
                calories_needed: calories,
                selected_foods: selectedFoods
              });
            
            if (error) {
              console.error('Erro ao inserir preferências nutricionais:', error);
            } else {
              console.log("Novas preferências criadas com sucesso");
            }
          }
        }
        
        setCurrentStep(2);
        console.log("Avançando para a etapa 2 (seleção de alimentos)");
      }
      return calories !== null;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Usuário não autenticado");
        toast.error("Usuário não autenticado");
        return false;
      }

      console.log("Confirmando seleção de alimentos para usuário:", user.id);
      console.log("Alimentos selecionados:", selectedFoods);
      console.log("Alimentos por tipo de refeição:", foodsByMealType);

      const { data: recentPrefs, error: recentError } = await supabase
        .from('nutrition_preferences')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentError) {
        console.error('Erro ao buscar preferência mais recente:', recentError);
        console.log("Tentando criar um novo registro após erro na busca");
      }

      let updateSuccess = false;
      
      if (recentPrefs?.id) {
        console.log("Encontrado registro existente. Atualizando ID:", recentPrefs.id);
        const { error: updateError } = await supabase
          .from('nutrition_preferences')
          .update({ 
            selected_foods: selectedFoods
          })
          .eq('id', recentPrefs.id);

        if (updateError) {
          console.error('Erro ao atualizar preferências:', updateError);
          toast.error("Erro ao salvar preferências de alimentos");
          return false;
        } else {
          updateSuccess = true;
          console.log("Preferências atualizadas com sucesso no registro existente");
        }
      } else {
        console.log("Nenhum registro encontrado ou erro na busca. Criando novo...");
        const { data: anyExisting } = await supabase
          .from('nutrition_preferences')
          .select('count')
          .eq('user_id', user.id);
          
        const hasExisting = anyExisting && Array.isArray(anyExisting) && anyExisting.length > 0;
        
        if (hasExisting) {
          console.log("Já existem registros para este usuário. Tentando excluir registros antigos...");
          await supabase
            .from('nutrition_preferences')
            .delete()
            .eq('user_id', user.id);
            
          console.log("Registros antigos excluídos. Criando novo registro limpo.");
        }
        
        const { error: insertError } = await supabase
          .from('nutrition_preferences')
          .insert({
            user_id: user.id,
            selected_foods: selectedFoods,
            weight: Number(formData.weight) || 70,
            height: Number(formData.height) || 170,
            age: Number(formData.age) || 30,
            gender: formData.gender || 'male',
            activity_level: (formData.activityLevel as "sedentary" | "light" | "moderate" | "intense") || 'moderate',
            goal: mapGoalToDbValue(formData.goal) || 'maintain'
          });

        if (insertError) {
          console.error('Erro ao inserir preferências:', insertError);
          toast.error("Erro ao salvar preferências de alimentos");
          return false;
        } else {
          updateSuccess = true;
          console.log("Novo registro de preferências criado com sucesso");
        }
      }

      if (updateSuccess) {
        console.log("Preferências de alimentos salvas com sucesso!");
        console.log("Avançando para a etapa 3 (restrições dietéticas)");
        
        console.log("Configurando próxima etapa para 3");
        setCurrentStep(3);
        
        toast.success("Preferências de alimentos salvas! Agora informe suas restrições dietéticas.");
        return true;
      }
      
      console.error("Falha ao salvar preferências de alimentos");
      return false;
    } catch (error) {
      console.error('Erro ao salvar preferências de alimentos:', error);
      toast.error("Erro ao salvar preferências de alimentos");
      return false;
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

      const { error: prefsError } = await supabase
        .from('dietary_preferences')
        .upsert({
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
        foodsByMealType,
        preferences,
        addTransaction: addTransactionAsync
      });

      if (!generatedMealPlan) {
        throw new Error('Plano alimentar não foi gerado corretamente');
      }

      console.log('Plano gerado:', generatedMealPlan);
      
      setMealPlan(generatedMealPlan);
      
      setDietaryPreferences(preferences);
      
      console.log("Avançando para a etapa 4 (exibição do plano alimentar)");
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

  const regenerateMealPlan = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para gerar um plano alimentar");
        return;
      }
      
      const { data: preferences } = await supabase
        .from('dietary_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (!preferences) {
        toast.error("Não foi possível encontrar suas preferências dietéticas");
        return;
      }
      
      const { data: nutritionPrefs } = await supabase
        .from('nutrition_preferences')
        .select('selected_foods')
        .eq('user_id', user.id)
        .single();
        
      if (!nutritionPrefs || !nutritionPrefs.selected_foods) {
        toast.error("Não foi possível encontrar suas preferências alimentares");
        return;
      }
      
      // Converta os valores de string para número
      const weightNum = Number(formData.weight);
      const heightNum = Number(formData.height);
      const ageNum = Number(formData.age);
      
      // Obtenha os alimentos selecionados com dados completos
      const selectedFoodsData = protocolFoods.filter(food => 
        nutritionPrefs.selected_foods.includes(food.id)
      );
      
      const newMealPlan = await generateMealPlan({
        userData: {
          id: user.id,
          weight: weightNum,
          height: heightNum,
          age: ageNum,
          gender: formData.gender,
          activityLevel: formData.activityLevel,
          goal: formData.goal,
          dailyCalories: calorieNeeds
        },
        selectedFoods: selectedFoodsData,
        preferences: {
          hasAllergies: preferences.has_allergies,
          allergies: preferences.allergies,
          dietaryRestrictions: preferences.dietary_restrictions,
          trainingTime: preferences.training_time
        },
        addTransaction: addTransactionAsync
      });
      
      setMealPlan(newMealPlan);
      toast.success("Plano alimentar atualizado com sucesso!");
      
    } catch (error) {
      console.error("Erro ao regenerar plano alimentar:", error);
      toast.error("Não foi possível gerar um novo plano alimentar");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mealPlan) {
      console.log("PLANO ALIMENTAR ATUALIZADO:", mealPlan);
      console.log("Plano possui weeklyPlan?", !!mealPlan.weeklyPlan);
      console.log("Step atual:", currentStep);
    }
  }, [mealPlan, currentStep]);

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
    regenerateMealPlan,
  };
};
