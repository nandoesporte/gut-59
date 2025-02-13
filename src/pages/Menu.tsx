
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CalorieCalculator, CalorieCalculatorForm, activityLevels, goals } from "@/components/menu/CalorieCalculator";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WelcomeScreen } from "@/components/menu/WelcomeScreen";
import { ProgressSteps } from "@/components/menu/ProgressSteps";
import { MealPlanDisplay } from "@/components/menu/MealPlanDisplay";

interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  food_group_id: number;
}

interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

interface MealPlan {
  dailyPlan: {
    [key: string]: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
      };
    };
  };
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  recommendations: {
    preworkout: string;
    postworkout: string;
    general: string;
  };
}

const Menu = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [formData, setFormData] = useState<CalorieCalculatorForm>({
    weight: 0,
    height: 0,
    age: 0,
    gender: "male",
    activityLevel: "",
    goal: "",
  });

  useEffect(() => {
    const fetchProtocolFoods = async () => {
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('*')
        .in('food_group_id', [1, 2, 3, 4]);

      if (error) {
        console.error('Error fetching foods:', error);
        toast.error("Erro ao carregar lista de alimentos");
        return;
      }

      setProtocolFoods(data);
    };

    fetchProtocolFoods();
  }, []);

  useEffect(() => {
    const calculateTotalCalories = () => {
      const total = protocolFoods
        .filter(food => selectedFoods.includes(food.id))
        .reduce((sum, food) => sum + food.calories, 0);
      setTotalCalories(total);
    };

    calculateTotalCalories();
  }, [selectedFoods, protocolFoods]);

  const handleStartDiet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Por favor, faça login para continuar");
        return;
      }
      setCurrentStep(1);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erro ao iniciar o plano alimentar");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {currentStep === 1 ? (
        <WelcomeScreen onStart={handleStartDiet} />
      ) : (
        <div className="space-y-8">
          {currentStep === 4 && mealPlan ? (
            <MealPlanDisplay mealPlan={mealPlan} />
          ) : (
            <div className="container mx-auto px-4 py-8">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                  <h1 className="text-3xl font-bold text-primary">Cardápio Personalizado</h1>
                  <p className="text-gray-600">
                    Calcule suas necessidades calóricas diárias e receba um cardápio personalizado
                  </p>
                </div>

                <ProgressSteps currentStep={currentStep} />

                <Card className="p-6 space-y-6">
                  {currentStep === 1 && (
                    <CalorieCalculator
                      formData={formData}
                      onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                      onCalculate={() => setCurrentStep(2)}
                      calorieNeeds={calorieNeeds}
                    />
                  )}

                  {currentStep === 2 && (
                    <FoodSelector
                      protocolFoods={protocolFoods}
                      selectedFoods={selectedFoods}
                      onFoodSelection={(foodId) => {
                        setSelectedFoods(prev => {
                          if (prev.includes(foodId)) {
                            return prev.filter(id => id !== foodId);
                          }
                          return [...prev, foodId];
                        });
                      }}
                      totalCalories={totalCalories}
                      onBack={() => setCurrentStep(1)}
                      onConfirm={() => setCurrentStep(3)}
                    />
                  )}

                  {currentStep === 3 && (
                    <DietaryPreferencesForm
                      onSubmit={async (preferences: DietaryPreferences) => {
                        try {
                          const { data: userData } = await supabase.auth.getUser();
                          if (!userData.user) {
                            toast.error("Usuário não autenticado");
                            return;
                          }

                          if (!calorieNeeds) {
                            toast.error("Necessidade calórica não calculada");
                            return;
                          }

                          if (selectedFoods.length === 0) {
                            toast.error("Nenhum alimento selecionado");
                            return;
                          }

                          const requestData = {
                            userData: {
                              ...formData,
                              userId: userData.user.id,
                              dailyCalories: calorieNeeds
                            },
                            selectedFoods,
                            dietaryPreferences: preferences
                          };

                          console.log('Enviando requisição com dados:', JSON.stringify(requestData, null, 2));

                          const { data: responseData, error } = await supabase.functions.invoke('generate-meal-plan', {
                            body: requestData
                          });

                          if (error) {
                            console.error('Erro da função edge:', error);
                            throw error;
                          }

                          if (!responseData) {
                            throw new Error('Nenhum dado recebido do gerador de cardápio');
                          }

                          console.log('Cardápio recebido:', responseData);
                          setMealPlan(responseData);
                          setCurrentStep(4);
                          toast.success("Cardápio personalizado gerado com sucesso!");
                        } catch (error) {
                          console.error('Erro ao gerar cardápio:', error);
                          toast.error("Erro ao gerar cardápio personalizado. Por favor, tente novamente.");
                        }
                      }}
                    />
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Menu;
