
import { Card } from "@/components/ui/card";
import { InitialMenuContent } from "@/components/menu/InitialMenuContent";
import { CalorieCalculatorStep } from "@/components/menu/CalorieCalculatorStep";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { MealPlanDisplay } from "@/components/menu/MealPlanDisplay";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { useMenuController } from "@/components/menu/MenuController";
import { Loader2 } from "lucide-react";

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

  const renderStep = () => {
    if (loading && currentStep !== 1.5) {
      return (
        <Card className="p-6 bg-white shadow-md border border-green-100">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-lg font-medium text-green-700">
              {currentStep === 2 ? "Processando sua seleção..." :
               currentStep === 3 ? "Gerando seu plano alimentar..." :
               "Aguarde um momento..."}
            </p>
          </div>
        </Card>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <InitialMenuContent onStartDiet={() => setCurrentStep(1.5)} />
        );
      case 1.5:
        return (
          <CalorieCalculatorStep
            formData={formData}
            onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
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
            onBack={() => setCurrentStep(1.5)}
            onConfirm={() => setCurrentStep(3)}
          />
        );
      case 3:
        return (
          <div className="space-y-6">
            <Card className="p-6 bg-white shadow-md border border-green-100">
              <DietaryPreferencesForm
                onSubmit={handleDietaryPreferences}
                onBack={() => setCurrentStep(2)}
              />
            </Card>
          </div>
        );
      case 4:
        if (!mealPlan) return null;
        return <MealPlanDisplay mealPlan={mealPlan} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl min-h-screen pb-24">
      <div className="space-y-6 bg-gradient-to-b from-green-50/50 to-white rounded-lg p-6">
        {renderStep()}
      </div>
    </div>
  );
};

export default Menu;
