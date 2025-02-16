import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CalorieCalculator, CalorieCalculatorForm, activityLevels, goals } from "@/components/menu/CalorieCalculator";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Coffee, Utensils, Apple, Moon, Dumbbell, Plus } from "lucide-react";

interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  food_group_id: number;
  portion?: number;
  portionUnit?: string;
  calculatedNutrients?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

interface MealPlan {
  dailyPlan: {
    breakfast: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
      };
    };
    morningSnack: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
      };
    };
    lunch: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
      };
    };
    afternoonSnack: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
      };
    };
    dinner: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
      };
    };
  };
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  recommendations: {
    preworkout: string;
    postworkout: string;
    general: string;
    timing: string[];
  };
}

const Menu = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences | null>(null);
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

  const calculateBMR = (data: CalorieCalculatorForm) => {
    if (data.gender === "male") {
      return 88.36 + (13.4 * data.weight) + (4.8 * data.height) - (5.7 * data.age);
    } else {
      return 447.6 + (9.2 * data.weight) + (3.1 * data.height) - (4.3 * data.age);
    }
  };

  const handleCalculateCalories = () => {
    if (!formData.activityLevel || !formData.goal) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    const bmr = calculateBMR(formData);
    const activityFactor = activityLevels[formData.activityLevel as keyof typeof activityLevels].factor;
    const goalFactor = goals[formData.goal as keyof typeof goals].factor;
    const dailyCalories = Math.round(bmr * activityFactor * goalFactor);

    setCalorieNeeds(dailyCalories);
    setCurrentStep(2);
    toast.success("Cálculo realizado com sucesso!");
  };

  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {
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

      setDietaryPreferences(preferences);

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
  };

  const handleFoodSelection = (foodId: string) => {
    setSelectedFoods(prev => {
      if (prev.includes(foodId)) {
        return prev.filter(id => id !== foodId);
      }
      if (prev.length >= 20) {
        toast.error("Você já selecionou o máximo de 20 alimentos!");
        return prev;
      }
      return [...prev, foodId];
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-6">
              <img src="/logo.png" alt="Logo" className="h-8" />
              <Button variant="outline" size="sm">
                Suporte
              </Button>
            </div>

            <Card className="p-6">
              <div className="text-center space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Como Montar sua Dieta?</h1>
                <p className="text-gray-600">
                  Vamos te ajudar a criar um plano alimentar personalizado baseado em suas necessidades
                </p>
              </div>

              <div className="mt-8">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="how">
                    <AccordionTrigger>Como funciona?</AccordionTrigger>
                    <AccordionContent>
                      O nosso sistema utiliza inteligência artificial para criar um plano alimentar personalizado 
                      baseado nos seus dados e preferências.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="receive">
                    <AccordionTrigger>Como receber a Dieta?</AccordionTrigger>
                    <AccordionContent>
                      Após preencher seus dados, você receberá um plano detalhado com todas as refeições 
                      e recomendações personalizadas.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="start">
                    <AccordionTrigger>Como começar?</AccordionTrigger>
                    <AccordionContent>
                      Clique no botão abaixo para começar a montar sua dieta personalizada.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Button 
                  onClick={() => setCurrentStep(1.5)}
                  className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white"
                >
                  MONTAR MINHA DIETA
                </Button>
              </div>
            </Card>
          </div>
        );
      case 1.5:
        return (
          <Card className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Calcule suas Calorias</h2>
              <p className="text-gray-600 mt-2">
                Preencha seus dados para calcularmos suas necessidades calóricas
              </p>
            </div>
            <CalorieCalculator
              formData={formData}
              onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
              onCalculate={handleCalculateCalories}
              calorieNeeds={calorieNeeds}
            />
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(1)}
              className="mt-4"
            >
              Voltar
            </Button>
          </Card>
        );
      case 2:
        return (
          <FoodSelector
            protocolFoods={protocolFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={handleFoodSelection}
            totalCalories={totalCalories}
            onBack={() => setCurrentStep(1.5)}
            onConfirm={() => setCurrentStep(3)}
          />
        );
      case 3:
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <DietaryPreferencesForm
                onSubmit={handleDietaryPreferences}
                onBack={() => setCurrentStep(2)}
              />
            </Card>
          </div>
        );
      case 4:
        if (!mealPlan) return null;
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                Café da manhã
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {mealPlan.dailyPlan.breakfast?.foods.map((food) => (
                  <Button
                    key={food.id}
                    variant="outline"
                    className="flex items-center justify-center p-2 h-auto text-sm"
                  >
                    {food.name} ({food.portion}{food.portionUnit})
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Apple className="h-5 w-5" />
                Lanche da Manhã
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {mealPlan.dailyPlan.morningSnack?.foods.map((food) => (
                  <Button
                    key={food.id}
                    variant="outline"
                    className="flex items-center justify-center p-2 h-auto text-sm"
                  >
                    {food.name} ({food.portion}{food.portionUnit})
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Almoço
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {mealPlan.dailyPlan.lunch?.foods.map((food) => (
                  <Button
                    key={food.id}
                    variant="outline"
                    className="flex items-center justify-center p-2 h-auto text-sm"
                  >
                    {food.name} ({food.portion}{food.portionUnit})
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Apple className="h-5 w-5" />
                Lanche da Tarde
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {mealPlan.dailyPlan.afternoonSnack?.foods.map((food) => (
                  <Button
                    key={food.id}
                    variant="outline"
                    className="flex items-center justify-center p-2 h-auto text-sm"
                  >
                    {food.name} ({food.portion}{food.portionUnit})
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Jantar
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {mealPlan.dailyPlan.dinner?.foods.map((food) => (
                  <Button
                    key={food.id}
                    variant="outline"
                    className="flex items-center justify-center p-2 h-auto text-sm"
                  >
                    {food.name} ({food.portion}{food.portionUnit})
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Treinos e Atividades
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Pré-treino:</h4>
                  <p className="text-gray-600">{mealPlan.recommendations.preworkout}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Pós-treino:</h4>
                  <p className="text-gray-600">{mealPlan.recommendations.postworkout}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Adicionais na Dieta
              </h2>
              <div className="mt-4">
                <p className="text-gray-600">{mealPlan.recommendations.general}</p>
                <div className="mt-4 space-y-2">
                  {mealPlan.recommendations.timing.map((tip, index) => (
                    <p key={index} className="text-gray-600">• {tip}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
              <div className="container mx-auto max-w-3xl">
                <div className="text-center mb-2">
                  <p className="text-sm text-gray-600">
                    {mealPlan.totalNutrition.calories} kcal totais
                  </p>
                </div>
                <Button 
                  onClick={() => setCurrentStep(1)}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  COMEÇAR NOVA DIETA
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl min-h-screen pb-24">
      {renderStep()}
    </div>
  );
};

export default Menu;
