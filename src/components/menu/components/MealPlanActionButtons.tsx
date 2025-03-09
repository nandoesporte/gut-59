
import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Download } from "lucide-react";

interface MealPlanActionButtonsProps {
  onRefresh: () => Promise<void>;
  onDownload: () => void;
  isRefreshing: boolean;
}

export const MealPlanActionButtons: React.FC<MealPlanActionButtonsProps> = ({
  onRefresh,
  onDownload,
  isRefreshing
}) => {
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCcw className="h-4 w-4 mr-2" />
        {isRefreshing ? "Atualizando..." : "Novo Plano"}
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onDownload}
      >
        <Download className="h-4 w-4 mr-2" />
        PDF
      </Button>
    </div>
  );
};
