
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CalorieCalculator, CalorieCalculatorForm, activityLevels, goals } from "@/components/menu/CalorieCalculator";
import { FoodSelector } from "@/components/menu/FoodSelector";

interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const Menu = () => {
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);
  const [showFoodSelection, setShowFoodSelection] = useState(false);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
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
        .eq('food_group_id', 1);

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
    setShowFoodSelection(true);
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
      if (prev.length >= 5) {
        toast.error("Você já selecionou o máximo de 5 alimentos!");
        return prev;
      }
      return [...prev, foodId];
    });
  };

  const handleBack = () => {
    setShowFoodSelection(false);
    setSelectedFoods([]);
  };

  const handleConfirmSelection = () => {
    toast.success("Café da manhã salvo com sucesso!");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-primary">Cardápio Personalizado</h1>
          <p className="text-gray-600">
            Calcule suas necessidades calóricas diárias para atingir seus objetivos
          </p>
        </div>

        <Card className="p-6 space-y-6">
          {!showFoodSelection ? (
            <CalorieCalculator
              formData={formData}
              onInputChange={handleInputChange}
              onCalculate={handleCalculateCalories}
              calorieNeeds={calorieNeeds}
            />
          ) : (
            <FoodSelector
              protocolFoods={protocolFoods}
              selectedFoods={selectedFoods}
              onFoodSelection={handleFoodSelection}
              totalCalories={totalCalories}
              onBack={handleBack}
              onConfirm={handleConfirmSelection}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default Menu;
