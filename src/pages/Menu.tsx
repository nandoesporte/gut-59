
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CalorieCalculator, CalorieCalculatorForm, activityLevels, goals } from "@/components/menu/CalorieCalculator";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  const handleInputChange = (field: keyof CalorieCalculatorForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {
    setDietaryPreferences(preferences);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const response = await supabase.functions.invoke('generate-meal-plan', {
        body: {
          userData: {
            ...formData,
            userId: userData.user.id,
            dailyCalories: calorieNeeds
          },
          selectedFoods: selectedFoods,
          dietaryPreferences: preferences
        },
      });

      if (response.error) {
        throw response.error;
      }

      setMealPlan(response.data);
      setCurrentStep(4);
      toast.success("Cardápio personalizado gerado com sucesso!");
    } catch (error) {
      console.error('Error generating meal plan:', error);
      toast.error("Erro ao gerar cardápio personalizado");
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CalorieCalculator
            formData={formData}
            onInputChange={handleInputChange}
            onCalculate={handleCalculateCalories}
            calorieNeeds={calorieNeeds}
          />
        );
      case 2:
        return (
          <FoodSelector
            protocolFoods={protocolFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={handleFoodSelection}
            totalCalories={totalCalories}
            onBack={() => setCurrentStep(1)}
            onConfirm={() => setCurrentStep(3)}
          />
        );
      case 3:
        return (
          <DietaryPreferencesForm onSubmit={handleDietaryPreferences} />
        );
      case 4:
        return mealPlan ? (
          <div className="space-y-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="breakfast">
                <AccordionTrigger>Café da Manhã</AccordionTrigger>
                <AccordionContent>
                  {/* Render breakfast meals */}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="lunch">
                <AccordionTrigger>Almoço</AccordionTrigger>
                <AccordionContent>
                  {/* Render lunch meals */}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="snacks">
                <AccordionTrigger>Lanches</AccordionTrigger>
                <AccordionContent>
                  {/* Render snacks */}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="dinner">
                <AccordionTrigger>Jantar</AccordionTrigger>
                <AccordionContent>
                  {/* Render dinner meals */}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="recommendations">
                <AccordionTrigger>Recomendações</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold">Pré-treino:</h4>
                      <p>{mealPlan.recommendations.preworkout}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Pós-treino:</h4>
                      <p>{mealPlan.recommendations.postworkout}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Recomendações Gerais:</h4>
                      <p>{mealPlan.recommendations.general}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="bg-primary-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Resumo Nutricional Diário</h3>
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
            
            <Button onClick={() => setCurrentStep(1)} variant="outline">
              Recomeçar
            </Button>
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-primary">Cardápio Personalizado</h1>
          <p className="text-gray-600">
            Calcule suas necessidades calóricas diárias e receba um cardápio personalizado
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <ol className="flex items-center w-full space-x-2 sm:space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <li key={step} className="flex items-center">
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full ${
                    currentStep === step
                      ? 'bg-primary text-white'
                      : currentStep > step
                      ? 'bg-primary-200 text-primary-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </span>
                {step < 4 && (
                  <div
                    className={`h-px w-12 sm:w-24 ${
                      currentStep > step ? 'bg-primary-200' : 'bg-gray-200'
                    }`}
                  />
                )}
              </li>
            ))}
          </ol>
        </div>

        <Card className="p-6 space-y-6">
          {renderStep()}
        </Card>
      </div>
    </div>
  );
};

export default Menu;
