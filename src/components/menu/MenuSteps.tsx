
import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { CalorieCalculatorStep } from "@/components/menu/CalorieCalculatorStep";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { DietaryPreferencesForm } from "@/components/menu/DietaryPreferencesForm";
import { MealPlanDisplay } from "@/components/menu/MealPlanDisplay";
import { MealPlanHistory } from "@/components/menu/MealPlanHistory";
import type { ProtocolFood, MealPlan } from "./types";
import type { CalorieCalculatorForm } from "./CalorieCalculator";

interface MenuStepsProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  calorieNeeds: number | null;
  selectedFoods: string[];
  protocolFoods: ProtocolFood[];
  totalCalories: number;
  mealPlan: MealPlan | null;
  formData: CalorieCalculatorForm;
  handleCalculateCalories: () => Promise<boolean | null> | boolean;
  handleFoodSelection: (foodId: string, food?: ProtocolFood) => void;
  handleConfirmFoodSelection: () => Promise<boolean> | boolean; // Updated type here to match implementation
  handleDietaryPreferences: (preferences: any) => Promise<boolean>;
  setFormData: (formData: CalorieCalculatorForm | ((prev: CalorieCalculatorForm) => CalorieCalculatorForm)) => void;
  regenerateMealPlan: () => Promise<void>;
}

export const MenuSteps = ({
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
  handleConfirmFoodSelection,
  handleDietaryPreferences,
  setFormData,
  regenerateMealPlan,
}: MenuStepsProps) => {
  const mealPlanRef = useRef<HTMLDivElement>(null);
  const restrictionsCardRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to meal plan when it's generated
  useEffect(() => {
    if (mealPlan && mealPlanRef.current) {
      console.log("Scrolling to meal plan section");
      mealPlanRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [mealPlan]);
  
  // Auto-scroll to restrictions card when moving to step 3
  useEffect(() => {
    if (currentStep === 3 && restrictionsCardRef.current) {
      console.log("Scrolling to restrictions section");
      restrictionsCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [currentStep]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Etapa 1: Cálculo de Calorias */}
      <Card className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
          <span className={`bg-${currentStep >= 1 ? 'green' : 'gray'}-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2`}>1</span>
          Dados Básicos e Calorias
        </h2>
        {currentStep === 1 && (
          <CalorieCalculatorStep
            formData={formData}
            onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
            onCalculate={handleCalculateCalories}
            calorieNeeds={calorieNeeds}
          />
        )}
        {currentStep > 1 && (
          <div className="text-center py-2">
            <p className="text-green-600 font-medium">✓ Calorias diárias calculadas: {calorieNeeds} kcal</p>
            <button 
              onClick={() => setCurrentStep(1)} 
              className="text-sm text-gray-500 underline mt-2"
            >
              Editar
            </button>
          </div>
        )}
      </Card>

      {/* Etapa 2: Seleção de Alimentos */}
      <Card className={`p-4 sm:p-6 ${currentStep < 2 ? 'opacity-70' : ''}`}>
        <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
          <span className={`bg-${currentStep >= 2 ? 'green' : 'gray'}-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2`}>2</span>
          Preferências Alimentares
        </h2>
        {currentStep === 2 && (
          <FoodSelector
            protocolFoods={protocolFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={handleFoodSelection}
            totalCalories={totalCalories}
            onBack={() => setCurrentStep(1)}
            onConfirm={handleConfirmFoodSelection}
          />
        )}
        {currentStep > 2 && (
          <div className="text-center py-2">
            <p className="text-green-600 font-medium">✓ {selectedFoods.length} alimentos selecionados</p>
            <button 
              onClick={() => setCurrentStep(2)} 
              className="text-sm text-gray-500 underline mt-2"
            >
              Editar
            </button>
          </div>
        )}
      </Card>

      {/* Etapa 3: Preferências Dietéticas */}
      <div ref={restrictionsCardRef}>
        <Card className={`p-4 sm:p-6 ${currentStep < 3 ? 'opacity-70' : ''}`}>
          <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
            <span className={`bg-${currentStep >= 3 ? 'green' : 'gray'}-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2`}>3</span>
            Restrições e Preferências
          </h2>
          {currentStep === 3 && (
            <DietaryPreferencesForm
              onSubmit={handleDietaryPreferences}
              onBack={() => setCurrentStep(2)}
            />
          )}
          {currentStep > 3 && (
            <div className="text-center py-2">
              <p className="text-green-600 font-medium">✓ Preferências dietéticas registradas</p>
              <button 
                onClick={() => setCurrentStep(3)} 
                className="text-sm text-gray-500 underline mt-2"
              >
                Editar
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Etapa 4: Exibição do Plano */}
      {currentStep === 4 && mealPlan && (
        <div ref={mealPlanRef}>
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
              <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">4</span>
              Seu Plano Alimentar
            </h2>
            <MealPlanDisplay
              mealPlan={mealPlan}
              onRefresh={regenerateMealPlan}
            />
          </Card>
        </div>
      )}

      {/* Histórico de Planos */}
      <MealPlanHistory />
    </div>
  );
};
