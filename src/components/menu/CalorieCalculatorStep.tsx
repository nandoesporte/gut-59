
import { Card } from "@/components/ui/card";
import { CalorieCalculator, CalorieCalculatorForm } from "./CalorieCalculator";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
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
      
      <AlertDialog open={calorieNeeds !== null}>
        <AlertDialogContent className="bg-white p-6 sm:p-8 max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-green-500" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Gerando seu plano alimentar personalizado...
            </h3>
            <p className="text-gray-600">
              Este processo pode levar de 1 a 2 minutos.
              <br />
              Por favor, aguarde enquanto preparamos seu cardápio.
            </p>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <CalorieCalculator
        formData={formData}
        onInputChange={onInputChange}
        onCalculate={onCalculate}
        calorieNeeds={calorieNeeds}
      />
    </div>
  );
};
