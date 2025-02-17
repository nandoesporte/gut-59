
import { Card } from "@/components/ui/card";
import { CalorieCalculator, CalorieCalculatorForm } from "./CalorieCalculator";
import { Loader2 } from "lucide-react";

interface CalorieCalculatorStepProps {
  formData: CalorieCalculatorForm;
  onInputChange: (field: keyof CalorieCalculatorForm, value: string | number) => void;
  onCalculate: () => void;
  calorieNeeds: number | null;
}

export const CalorieCalculatorStep = ({
  formData,
  onInputChange,
  onCalculate,
  calorieNeeds,
}: CalorieCalculatorStepProps) => {
  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Objetivo do Cardápio</h2>
        <p className="text-gray-600 mt-2">
          Preencha seus dados para calcularmos suas necessidades calóricas
        </p>
      </div>
      {calorieNeeds === null ? (
        <CalorieCalculator
          formData={formData}
          onInputChange={onInputChange}
          onCalculate={onCalculate}
          calorieNeeds={calorieNeeds}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <p className="text-lg font-medium text-gray-700">
            Gerando seu plano alimentar personalizado...
          </p>
        </div>
      )}
    </div>
  );
};
