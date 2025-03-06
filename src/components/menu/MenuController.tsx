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

  const { protocolFoods, loading: foodsLoading, error: foodsError } = useProtocolFoods();
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
      console.log("Calculating calories with form data:", formData);
      const calories = await calculateCalories(formData, selectedLevel);
      
      if (!calories) {
        console.error("No calories returned from calculation");
        return false;
      }
      
      console.log("Calories calculated successfully:", calories);
      toast.success("Calorias calculadas com sucesso!");
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log("Saving preferences for user:", user.id);
          await saveUserPreferences(user.id, calories);
        } else {
          console.log("User not authenticated, skipping preference save");
        }
      } catch (authError) {
        console.warn("Error checking authentication, proceeding to next step anyway:", authError);
      }
      
      console.log("Advancing to step 2 (food selection)");
      setCurrentStep(2);
      return true;
    } catch (error) {
      console.error('Error in handleCalculateCalories:', error);
      toast.error("Erro ao calcular as calorias necessárias");
      return false;
    }
  };

  const saveUserPreferences = async (userId: string, calories: number) => {
    try {
      console.log("Saving form data:", formData);
      
      const { data: existingRecord, error: selectError } = await supabase
        .from('nutrition_preferences')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (selectError) {
        console.error('Error checking existing preferences:', selectError);
        return;
      }
      
      const activityLevel = formData.activityLevel as "sedentary" | "light" | "moderate" | "intense";
      const goal = mapGoalToDbValue(formData.goal);
      
      console.log("Goal mapping:", formData.goal, "->", goal);
      
      if (existingRecord) {
        console.log("Updating existing record:", existingRecord.id);
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
          console.error('Error updating nutrition preferences:', error);
        } else {
          console.log("Preferences updated successfully");
        }
      } else {
        console.log("Creating new preferences record");
        const { error } = await supabase
          .from('nutrition_preferences')
          .insert({
            user_id: userId,
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
          console.error('Error inserting nutrition preferences:', error);
        } else {
          console.log("New preferences created successfully");
        }
      }
    } catch (dbError) {
      console.error("Database error while saving preferences:", dbError);
    }
  };

  const handleConfirmFoodSelection = async () => {
    console.log("Iniciando confirmação de seleção de alimentos");
    
    if (selectedFoods.length === 0) {
      console.warn("Nenhum alimento selecionado!");
      toast.error("Por favor, selecione pelo menos um alimento antes de prosseguir");
      return false;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("Usuário não autenticado, avançando sem salvar preferências");
        toast.success("Seleção de alimentos confirmada!");
        setCurrentStep(3);
        return true;
      }

      console.log("Confirmando seleção de alimentos para usuário:", user.id);
      console.log("Alimentos selecionados:", selectedFoods);
      console.log("Alimentos por tipo de refeição:", foodsByMealType);

      try {
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
          } else {
            updateSuccess = true;
            console.log("Novo registro de preferências criado com sucesso");
          }
        }

        console.log("Processamento de preferências de alimentos concluído");
        console.log("Avançando para a etapa 3 (restrições dietéticas)");
        
        setCurrentStep(3);
        
        if (updateSuccess) {
          toast.success("Preferências de alimentos salvas! Agora informe suas restrições dietéticas.");
        } else {
          toast.success("Suas escolhas de alimentos foram confirmadas!");
        }
        
        return true;
      } catch (dbError) {
        console.error("Erro de banco de dados:", dbError);
        setCurrentStep(3);
        toast.success("Preferências de alimentos confirmadas!");
        return true;
      }
    } catch (error) {
      console.error('Erro ao processar seleção de alimentos:', error);
      toast.error("Ocorreu um erro ao processar sua seleção. Tente novamente.");
      return false;
    }
  };

  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {    
    console.log('Preferências alimentares recebidas:', preferences);
    console.log('Alimentos selecionados:', selectedFoods);

    setDietaryPreferences(preferences);

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

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData.user) {
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
        
        toast.loading("Gerando plano alimentar personalizado com Llama 3.2 1B...");
        
        try {
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
            selectedFoods: protocolFoods.filter(food => selectedFoods.includes(food.id)),
            foodsByMealType,
            preferences,
            addTransaction: addTransactionAsync
          });

          if (generatedMealPlan) {
            setMealPlan(generatedMealPlan);
            console.log('Plano gerado:', generatedMealPlan);
          } else {
            console.error('Plano alimentar não foi gerado corretamente');
            toast.error("Falha ao gerar plano alimentar. Tente novamente.");
          }
        } catch (error) {
          console.error('Erro ao gerar plano alimentar:', error);
          toast.error("Erro ao gerar o plano alimentar. Tente novamente.");
        } finally {
          setLoading(false);
        }
      } else {
        console.log("Usuário não autenticado. Criando plano básico.");
        
        const basicMealPlan: MealPlan = {
          userCalories: calorieNeeds,
          weeklyPlan: {
            monday: {
              dayName: "Segunda",
              meals: {
                breakfast: {
                  description: "Café da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                morningSnack: {
                  description: "Lanche da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                lunch: {
                  description: "Almoço",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                afternoonSnack: {
                  description: "Lanche da Tarde",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                dinner: {
                  description: "Jantar",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                }
              },
              dailyTotals: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
                fiber: 0
              }
            },
            tuesday: {
              dayName: "Terça",
              meals: {
                breakfast: {
                  description: "Café da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                morningSnack: {
                  description: "Lanche da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                lunch: {
                  description: "Almoço",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                afternoonSnack: {
                  description: "Lanche da Tarde",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                dinner: {
                  description: "Jantar",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                }
              },
              dailyTotals: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
                fiber: 0
              }
            },
            wednesday: {
              dayName: "Quarta",
              meals: {
                breakfast: {
                  description: "Café da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                morningSnack: {
                  description: "Lanche da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                lunch: {
                  description: "Almoço",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                afternoonSnack: {
                  description: "Lanche da Tarde",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                dinner: {
                  description: "Jantar",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                }
              },
              dailyTotals: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
                fiber: 0
              }
            },
            thursday: {
              dayName: "Quinta",
              meals: {
                breakfast: {
                  description: "Café da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                morningSnack: {
                  description: "Lanche da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                lunch: {
                  description: "Almoço",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                afternoonSnack: {
                  description: "Lanche da Tarde",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                dinner: {
                  description: "Jantar",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                }
              },
              dailyTotals: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
                fiber: 0
              }
            },
            friday: {
              dayName: "Sexta",
              meals: {
                breakfast: {
                  description: "Café da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                morningSnack: {
                  description: "Lanche da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                lunch: {
                  description: "Almoço",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                afternoonSnack: {
                  description: "Lanche da Tarde",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                dinner: {
                  description: "Jantar",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                }
              },
              dailyTotals: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
                fiber: 0
              }
            },
            saturday: {
              dayName: "Sábado",
              meals: {
                breakfast: {
                  description: "Café da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                morningSnack: {
                  description: "Lanche da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                lunch: {
                  description: "Almoço",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                afternoonSnack: {
                  description: "Lanche da Tarde",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                dinner: {
                  description: "Jantar",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                }
              },
              dailyTotals: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
                fiber: 0
              }
            },
            sunday: {
              dayName: "Domingo",
              meals: {
                breakfast: {
                  description: "Café da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                morningSnack: {
                  description: "Lanche da Manhã",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                lunch: {
                  description: "Almoço",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                afternoonSnack: {
                  description: "Lanche da Tarde",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                },
                dinner: {
                  description: "Jantar",
                  foods: [{ name: "Escolha um dos alimentos selecionados", portion: 1, unit: "porção", details: "" }],
                  calories: 0,
                  macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
                }
              },
              dailyTotals: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
                fiber: 0
              }
            }
          },
          weeklyTotals: {
            averageCalories: 0,
            averageProtein: 0,
            averageCarbs: 0,
            averageFats: 0,
            averageFiber: 0
          },
          recommendations: {
            general: "Para um plano personalizado completo, faça login na plataforma.",
            preworkout: "Consuma carboidratos de fácil digestão 30-60 minutos antes do treino.",
            postworkout: "Consuma proteínas e carboidratos até 30 minutos após o treino para melhor recuperação.",
            timing: [
              "Mantenha uma alimentação balanceada com proteínas, carboidratos e gorduras boas.",
              "Beba pelo menos 2 litros de água por dia."
            ]
          }
        };
        
        setMealPlan(basicMealPlan);
        toast.success("Plano básico criado! Para um plano personalizado completo, faça login.");
      }
      
      console.log("Avançando para a etapa 4 (exibição do plano alimentar)");
      setCurrentStep(4);
      return true;
    } catch (error) {
      console.error('Erro completo:', error);
      toast.error("Erro ao processar suas preferências. Tente novamente.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mealPlan) {
      console.log("MEAL PLAN UPDATED:", mealPlan);
      console.log("Plan has weeklyPlan?", !!mealPlan.weeklyPlan);
      console.log("Current step:", currentStep);
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
    loading: loading || foodsLoading,
    foodsError,
    handleCalculateCalories,
    handleFoodSelection,
    handleConfirmFoodSelection,
    handleDietaryPreferences,
    setFormData,
  };
};
