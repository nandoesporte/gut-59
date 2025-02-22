
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
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <MenuHeader onStart={() => setCurrentStep(1.5)} />
            <InitialMenuContent onStartDiet={() => setCurrentStep(1.5)} />
          </div>
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
          <DietaryPreferencesForm
            onSubmit={handleDietaryPreferences}
            onBack={() => setCurrentStep(2)}
          />
        );
      case 4:
        return (
          <div className="space-y-6">
            {mealPlan && (
              <MealPlanDisplay 
                mealPlan={mealPlan} 
                onRefresh={async () => Promise.resolve()} // Fixed: return a Promise
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
