
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CalorieCalculator, CalorieCalculatorForm, activityLevels, goals } from "@/components/menu/CalorieCalculator";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { MealPlanDisplay } from "@/components/menu/MealPlanDisplay";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ProtocolFood, DietaryPreferences, MealPlan } from "@/components/menu/types";
import SymptomTracker from "@/components/SymptomTracker";
import FoodDiary from "@/components/FoodDiary";
import ShoppingList from "@/components/ShoppingList";
import Education from "@/components/Education";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const Menu = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [showShopping, setShowShopping] = useState(false);
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

  const renderAdditionalSections = () => (
    <div className="space-y-8 mt-8">
      <div className="bg-[#F2FCE2] rounded-lg shadow-sm p-6 border border-green-100">
        <h2 className="text-2xl font-semibold text-green-500 mb-6">Diário Alimentar</h2>
        <FoodDiary />
      </div>

      <div className="bg-[#F2FCE2] rounded-lg shadow-sm p-6 border border-green-100">
        <h2 className="text-2xl font-semibold text-green-500 mb-6">Registro de Sintomas</h2>
        <SymptomTracker />
      </div>

      <div className="bg-[#F2FCE2] rounded-lg shadow-sm p-6 border border-green-100">
        <h2 className="text-2xl font-semibold text-green-500 mb-6">Protocolo de Modulação Intestinal</h2>
        <Education />
      </div>

      <Card className="bg-[#F2FCE2] shadow-sm border border-green-100">
        <div className="p-4">
          <Button
            variant="ghost"
            onClick={() => setShowShopping(!showShopping)}
            className="w-full flex justify-between items-center text-green-500 hover:text-green-600 hover:bg-green-50"
          >
            <span className="font-semibold">Lista de Compras</span>
            <ChevronDown className={`transform transition-transform ${showShopping ? 'rotate-180' : ''}`} />
          </Button>
          {showShopping && (
            <div className="mt-4">
              <ScrollArea className="h-[500px]">
                <ShoppingList />
              </ScrollArea>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="bg-[#F2FCE2]">
            <MenuHeader onStart={() => setCurrentStep(1.5)} />
            {renderAdditionalSections()}
          </div>
        );
      case 1.5:
        return (
          <Card className="p-6 bg-[#F2FCE2] border border-green-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-green-500">Calcule suas Calorias</h2>
              <p className="text-green-600 mt-2">
                Preencha seus dados para calcularmos suas necessidades calóricas
              </p>
            </div>
            <CalorieCalculator
              formData={formData}
              onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
              onCalculate={handleCalculateCalories}
              calorieNeeds={calorieNeeds}
            />
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
        return <MealPlanDisplay mealPlan={mealPlan} onReset={() => setCurrentStep(1)} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl min-h-screen pb-24 bg-green-50">
      {renderStep()}
    </div>
  );
};

export default Menu;
