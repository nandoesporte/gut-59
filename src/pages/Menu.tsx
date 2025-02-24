
import { Card } from "@/components/ui/card";
import { InitialMenuContent } from "@/components/menu/InitialMenuContent";
import { CalorieCalculatorStep } from "@/components/menu/CalorieCalculatorStep";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { MealPlanDisplay } from "@/components/menu/MealPlanDisplay";
import { MealPlanHistory } from "@/components/menu/MealPlanHistory";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { useMenuController } from "@/components/menu/MenuController";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DietaryPreferences } from "@/components/menu/types";

const Menu = () => {
  const {
    currentStep,
    setCurrentStep,
    calorieNeeds,
    selectedFoods,
    protocolFoods,
    totalCalories,
    mealPlan,
    formData,
    loading,
    handleCalculateCalories,
    handleFoodSelection,
    handleDietaryPreferences,
    setFormData,
  } = useMenuController();

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!currentStep || currentStep === 1) {
      return (
        <div className="space-y-6">
          <MenuHeader onStart={() => setCurrentStep(1.5)} />
          <MealPlanHistory />
          <InitialMenuContent onStartDiet={() => setCurrentStep(1.5)} />
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <Card className="p-6">
          <div className="space-y-8">
            <div className={currentStep === 1.5 ? "" : "opacity-50"}>
              <h2 className="text-xl font-semibold mb-4">1. Cálculo de Calorias</h2>
              <CalorieCalculatorStep
                formData={formData}
                onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                onCalculate={async () => {
                  try {
                    const success = await handleCalculateCalories();
                    if (success) {
                      setCurrentStep(2);
                    } else {
                      toast.error("Falha ao calcular calorias");
                    }
                  } catch (error) {
                    console.error('Erro ao calcular calorias:', error);
                    toast.error("Erro ao calcular calorias");
                  }
                }}
                calorieNeeds={calorieNeeds}
              />
            </div>

            {currentStep >= 2 && (
              <div className={currentStep === 2 ? "" : "opacity-50"}>
                <h2 className="text-xl font-semibold mb-4">2. Seleção de Alimentos</h2>
                <FoodSelector
                  protocolFoods={protocolFoods}
                  selectedFoods={selectedFoods}
                  onFoodSelection={handleFoodSelection}
                  totalCalories={totalCalories}
                  onBack={() => setCurrentStep(1.5)}
                  onConfirm={() => {
                    if (selectedFoods.length === 0) {
                      toast.error("Selecione pelo menos um alimento");
                      return;
                    }
                    setCurrentStep(3);
                  }}
                />
              </div>
            )}

            {currentStep >= 3 && (
              <div className={currentStep === 3 ? "" : "opacity-50"}>
                <h2 className="text-xl font-semibold mb-4">3. Preferências Alimentares</h2>
                <DietaryPreferencesForm
                  onSubmit={async (preferences: DietaryPreferences) => {
                    try {
                      const success = await handleDietaryPreferences(preferences);
                      if (success) {
                        setCurrentStep(4);
                      }
                    } catch (error) {
                      console.error('Erro ao gerar plano:', error);
                      toast.error("Erro ao gerar o plano alimentar");
                    }
                  }}
                  onBack={() => setCurrentStep(2)}
                />
              </div>
            )}

            {currentStep === 4 && mealPlan && (
              <div>
                <h2 className="text-xl font-semibold mb-4">4. Seu Plano Alimentar</h2>
                <MealPlanDisplay 
                  mealPlan={mealPlan} 
                  onRefresh={() => setCurrentStep(3)}
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Menu;
