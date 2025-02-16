
import { Card } from "@/components/ui/card";
import { InitialMenuContent } from "@/components/menu/InitialMenuContent";
import { CalorieCalculatorStep } from "@/components/menu/CalorieCalculatorStep";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { MealPlanDisplay } from "@/components/menu/MealPlanDisplay";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { useMenuController } from "@/components/menu/MenuController";

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
    handleCalculateCalories,
    handleFoodSelection,
    handleDietaryPreferences,
    setFormData,
  } = useMenuController();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <MenuHeader onStart={() => setCurrentStep(1.5)} />
            <div className="space-y-8 mt-8">
              {/* Resto do conteúdo inicial */}
              <InitialMenuContent onStartDiet={() => setCurrentStep(1.5)} />
            </div>
          </>
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
