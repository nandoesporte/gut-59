
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface WorkoutErrorProps {
  onReset: () => void;
}

export const WorkoutError = ({ onReset }: WorkoutErrorProps) => {
  return (
    <div className="text-center space-y-4 p-12">
      <h3 className="text-xl font-semibold text-red-600">
        Erro ao gerar o plano de treino
      </h3>
      <p className="text-muted-foreground">
        Não foi possível gerar seu plano. Por favor, tente novamente.
      </p>
      <Button onClick={onReset} variant="outline" size="lg">
        <RotateCcw className="w-4 h-4 mr-2" />
        Tentar Novamente
      </Button>
    </div>
  );
};
