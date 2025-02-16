
import { Card } from "@/components/ui/card";
import { CalorieCalculator, CalorieCalculatorForm } from "./CalorieCalculator";

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
    <Card className="p-6 bg-[#F2FCE2] border border-green-100">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-green-500">Calcule suas Calorias</h2>
        <p className="text-green-600 mt-2">
          Preencha seus dados para calcularmos suas necessidades calóricas
        </p>
      </div>
      <CalorieCalculator
        formData={formData}
        onInputChange={onInputChange}
        onCalculate={onCalculate}
        calorieNeeds={calorieNeeds}
      />
    </Card>
  );
};
