
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface MealPlanHeaderProps {
  onExport: () => Promise<void>;
}

export const MealPlanHeader = ({ onExport }: MealPlanHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-semibold">Seu Plano Alimentar</h2>
      <Button onClick={onExport} variant="outline">
        <FileDown className="w-4 h-4 mr-2" />
        Exportar PDF
      </Button>
    </div>
  );
};
