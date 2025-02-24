
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

  const renderStep = () => {
    if (loading && currentStep !== 1.5) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <MenuHeader onStart={() => setCurrentStep(1.5)} />
            <MealPlanHistory />
            <InitialMenuContent onStartDiet={() => setCurrentStep(1.5)} />
          </div>
        );
      case 1.5:
        return (
          <CalorieCalculatorStep
            formData={formData}
            onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
            onCalculate={async () => {
              try {
                const success = await handleCalculateCalories();
                if (success) {
                  setCurrentStep(2);
                }
              } catch (error) {
                console.error('Erro ao calcular calorias:', error);
                toast.error("Erro ao calcular calorias. Tente novamente.");
              }
            }}
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
            onConfirm={() => {
              if (selectedFoods.length === 0) {
                toast.error("Selecione pelo menos um alimento");
                return;
              }
              setCurrentStep(3);
            }}
          />
        );
      case 3:
        return (
          <DietaryPreferencesForm
            onSubmit={async (preferences: DietaryPreferences) => {
              try {
                const success = await handleDietaryPreferences(preferences);
                if (success) {
                  setCurrentStep(4);
                }
              } catch (error) {
                console.error('Erro ao gerar plano:', error);
                toast.error("Erro ao gerar o plano alimentar. Tente novamente.");
              }
            }}
            onBack={() => setCurrentStep(2)}
          />
        );
      case 4:
        return mealPlan ? (
          <MealPlanDisplay 
            mealPlan={mealPlan} 
            onRefresh={() => {
              try {
                setCurrentStep(3);
              } catch (error) {
                console.error('Erro ao atualizar cardápio:', error);
                toast.error("Erro ao atualizar o cardápio");
              }
            }}
          />
        ) : (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <MenuHeader onStart={() => setCurrentStep(1.5)} />
            <MealPlanHistory />
            <InitialMenuContent onStartDiet={() => setCurrentStep(1.5)} />
          </div>
        );
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
