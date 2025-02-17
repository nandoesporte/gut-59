
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
    <Card className="p-6 bg-primary-50 border border-primary-100">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-primary-600">Objetivo do Cardápio</h2>
        <p className="text-primary-700 mt-2">
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
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-lg font-medium text-primary-700">
            Gerando seu plano alimentar personalizado...
          </p>
        </div>
      )}
    </Card>
  );
};
