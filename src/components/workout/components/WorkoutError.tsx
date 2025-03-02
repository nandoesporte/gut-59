
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertCircle } from "lucide-react";

interface WorkoutErrorProps {
  onReset: () => void;
  errorMessage?: string;
}

export const WorkoutError = ({ onReset, errorMessage }: WorkoutErrorProps) => {
  return (
    <div className="text-center space-y-4 p-12 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10">
      <div className="flex justify-center">
        <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">
        Erro ao gerar o plano de treino
      </h3>
      
      <p className="text-muted-foreground">
        {errorMessage || "Não foi possível gerar seu plano. Por favor, tente novamente."}
      </p>
      
      <div className="pt-2">
        <Button onClick={onReset} variant="outline" size="lg" className="border-red-200 hover:bg-red-100 dark:hover:bg-red-900/20">
          <RotateCcw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    </div>
  );
};
