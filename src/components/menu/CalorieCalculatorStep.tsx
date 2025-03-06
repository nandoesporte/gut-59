
import React from "react";
import { Button } from "@/components/ui/button";
import { CalorieCalculator, CalorieCalculatorForm } from "./CalorieCalculator";
import { cn } from "@/lib/utils";

interface CalorieCalculatorStepProps {
  formData: CalorieCalculatorForm;
  onInputChange: (field: keyof CalorieCalculatorForm, value: string) => void;
  onCalculate: () => void;
  calorieNeeds: number | null;
}

export const CalorieCalculatorStep = ({
  formData,
  onInputChange,
  onCalculate,
  calorieNeeds,
}: CalorieCalculatorStepProps) => {
  // Changed to ensure handleCalculate doesn't expect parameters
  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log("Calculating calories for step 1...");
    onCalculate();
  };

  return (
    <div className="space-y-6">
      {calorieNeeds ? (
        <div className="text-center space-y-4 py-4">
          <p className="text-lg font-medium">Sua necessidade calórica diária é:</p>
          <div className="text-3xl font-bold text-green-600">{calorieNeeds} kcal</div>
          
          <div className="mt-4">
            <Button 
              onClick={() => {
                console.log("Continue button clicked, should move to next step");
                onCalculate(); // Trigger again to ensure next step
              }}
              className={cn(
                "bg-green-500 hover:bg-green-600 text-white font-semibold",
                "px-6 py-2 rounded-md shadow-sm", 
                "animate-pulse"
              )}
            >
              Continuar para Seleção de Alimentos
            </Button>
          </div>
        </div>
      ) : (
        <CalorieCalculator
          formData={formData}
          onInputChange={onInputChange}
          onCalculate={handleCalculate}
          calorieNeeds={calorieNeeds}
        />
      )}
    </div>
  );
};
