import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CalorieCalculator } from "@/components/menu/CalorieCalculator";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [formData, setFormData] = useState({
    weight: 0,
    height: 0,
    age: 0,
    gender: "male",
    activityLevel: "",
    goal: "",
  });

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
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-primary">Monte sua Dieta Personalizada</h1>
            <p className="text-gray-600">
              Ajudaremos você a criar um plano alimentar personalizado baseado em suas necessidades e objetivos
            </p>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Como funciona?</h2>
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger>Como Montar?</AccordionTrigger>
                <AccordionContent>
                  Você precisa preencher todos seus dados para que possamos criar uma dieta personalizada. 
                  A partir dos seus dados, nosso sistema irá calcular suas necessidades calóricas diárias.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Como receber a Dieta?</AccordionTrigger>
                <AccordionContent>
                  Após preencher seus dados e preferências, você receberá um plano alimentar personalizado 
                  com todas as refeições do dia e recomendações específicas para seus objetivos.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Como funciona?</AccordionTrigger>
                <AccordionContent>
                  Nossa inteligência artificial analisa seus dados e preferências para criar um plano 
                  alimentar balanceado que atenda suas necessidades calóricas e objetivos específicos.
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-6">
              <Button 
                onClick={handleStartDiet} 
                className="w-full bg-primary hover:bg-primary-600"
              >
                MONTAR MINHA DIETA
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-md">
              <div className="relative">
                <div className="flex items-center justify-between">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className={`flex-1 ${step < 4 ? 'border-t-2' : ''} ${
                      currentStep > step ? 'border-primary' : 'border-gray-200'
                    }`}>
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${currentStep >= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}
                      `}>
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Card className="p-6">
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
                }}
              />
            )}

            {currentStep === 4 && mealPlan && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-center mb-6">Seu Plano Alimentar Personalizado</h2>
                
                <Accordion type="single" collapsible className="w-full">
                  {Object.entries(mealPlan.dailyPlan).map(([meal, data]) => (
                    <AccordionItem key={meal} value={meal}>
                      <AccordionTrigger className="text-lg font-medium capitalize">
                        {meal}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            {data.foods.map((food) => (
                              <div key={food.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span>{food.name}</span>
                                <div className="text-sm text-gray-600">
                                  {food.calories} kcal
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium mb-2">Macronutrientes:</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="text-center">
                                <p className="font-medium">Proteínas</p>
                                <p>{data.macros.protein}g</p>
                              </div>
                              <div className="text-center">
                                <p className="font-medium">Carboidratos</p>
                                <p>{data.macros.carbs}g</p>
                              </div>
                              <div className="text-center">
                                <p className="font-medium">Gorduras</p>
                                <p>{data.macros.fats}g</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}

                  <AccordionItem value="recommendations">
                    <AccordionTrigger>Recomendações</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium">Pré-treino:</h4>
                          <p className="text-gray-600">{mealPlan.recommendations.preworkout}</p>
                        </div>
                        <div>
                          <h4 className="font-medium">Pós-treino:</h4>
                          <p className="text-gray-600">{mealPlan.recommendations.postworkout}</p>
                        </div>
                        <div>
                          <h4 className="font-medium">Recomendações Gerais:</h4>
                          <p className="text-gray-600">{mealPlan.recommendations.general}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="mt-6 p-4 bg-primary-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-4">Nutrição Total Diária</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Calorias Totais:</p>
                      <p>{mealPlan.totalNutrition.calories} kcal</p>
                    </div>
                    <div>
                      <p className="font-medium">Proteínas:</p>
                      <p>{mealPlan.totalNutrition.protein}g</p>
                    </div>
                    <div>
                      <p className="font-medium">Carboidratos:</p>
                      <p>{mealPlan.totalNutrition.carbs}g</p>
                    </div>
                    <div>
                      <p className="font-medium">Gorduras:</p>
                      <p>{mealPlan.totalNutrition.fats}g</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => window.print()}
                  className="w-full"
                  variant="outline"
                >
                  Imprimir Plano Alimentar
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default Menu;
