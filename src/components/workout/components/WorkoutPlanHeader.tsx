
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, RotateCcw, Bot } from "lucide-react";
import { WorkoutPlan } from "../types/workout-plan";

interface WorkoutPlanHeaderProps {
  workoutPlan: WorkoutPlan;
  onExportPDF: () => void;
  onRetry: () => void;
}

export const WorkoutPlanHeader = ({ workoutPlan, onExportPDF, onRetry }: WorkoutPlanHeaderProps) => {
  return (
    <div className="flex justify-between items-center flex-wrap gap-4">
      <div>
        <h2 className="text-2xl font-semibold">Seu Plano de Treino</h2>
        <div className="flex items-center mt-2 gap-2">
          <Badge variant="outline" className="flex items-center gap-1 bg-primary/5">
            <Bot className="w-3 h-3" />
            Gerado por Trenner2025 (Llama 3 8B via Groq)
          </Badge>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onRetry} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4 mr-2" />
          Gerar Novo
        </Button>
        <Button onClick={onExportPDF} variant="outline">
          <FileDown className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>
    </div>
  );
};
