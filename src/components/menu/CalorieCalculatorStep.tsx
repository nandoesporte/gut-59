
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
    <Card className="p-4 sm:p-6 w-full border border-gray-200">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Objetivo do Cardápio</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
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
        <div className="flex flex-col items-center justify-center py-6 sm:py-8 space-y-4">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-green-500" />
          <p className="text-base sm:text-lg font-medium text-gray-700">
            Gerando seu plano alimentar personalizado...
          </p>
        </div>
      )}
    </Card>
  );
};
