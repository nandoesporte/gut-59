
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
import { Button } from "@/components/ui/button";

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Monte sua Dieta Personalizada</h1>
            <p className="text-gray-600">Siga as etapas abaixo para criar seu plano alimentar</p>
          </div>

          <div className="space-y-8">
            {/* Etapa 1: Cálculo de Calorias */}
            <Card className={`p-6 ${currentStep !== 1 ? 'opacity-50' : ''}`}>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
                Dados Básicos e Calorias
              </h2>
              <CalorieCalculatorStep
                formData={formData}
                onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                onCalculate={async () => {
                  try {
                    const success = await handleCalculateCalories();
                    if (success) {
                      toast.success("Calorias calculadas com sucesso!");
                      handleNextStep();
                    }
                  } catch (error) {
                    console.error('Erro ao calcular calorias:', error);
                    toast.error("Erro ao calcular calorias. Tente novamente.");
                  }
                }}
                calorieNeeds={calorieNeeds}
              />
            </Card>

            {/* Etapa 2: Seleção de Alimentos */}
            {currentStep >= 2 && calorieNeeds && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">2</span>
                  Preferências Alimentares
                </h2>
                <FoodSelector
                  protocolFoods={protocolFoods}
                  selectedFoods={selectedFoods}
                  onFoodSelection={handleFoodSelection}
                  totalCalories={totalCalories}
                  onBack={handlePreviousStep}
                  onConfirm={() => {
                    if (selectedFoods.length === 0) {
                      toast.error("Selecione pelo menos um alimento");
                      return;
                    }
                    handleNextStep();
                  }}
                />
              </Card>
            )}

            {/* Etapa 3: Preferências Dietéticas */}
            {currentStep >= 3 && selectedFoods.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">3</span>
                  Restrições e Preferências
                </h2>
                <DietaryPreferencesForm
                  onSubmit={(preferences: DietaryPreferences) => {
                    handleDietaryPreferences(preferences);
                  }}
                  onBack={handlePreviousStep}
                />
              </Card>
            )}

            {/* Etapa 4: Exibição do Plano */}
            {mealPlan && currentStep === 4 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">4</span>
                  Seu Plano Alimentar
                </h2>
                <MealPlanDisplay
                  mealPlan={mealPlan}
                  onRefresh={async () => {
                    try {
                      return Promise.resolve();
                    } catch (error) {
                      console.error('Erro ao atualizar cardápio:', error);
                      toast.error("Erro ao atualizar o cardápio");
                      return Promise.reject(error);
                    }
                  }}
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
