
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { MealPlanItem } from "../types/meal-plan-history";

interface MealPlanCardProps {
  plan: MealPlanItem;
  onDelete: (planId: string) => Promise<void>;
  onDownload: (plan: MealPlanItem) => Promise<void>;
  isDeleting: boolean;
  isGeneratingPDF: boolean;
}

export const MealPlanCard = ({
  plan,
  onDelete,
  onDownload,
  isDeleting,
  isGeneratingPDF,
}: MealPlanCardProps) => {
  return (
    <Card className="bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium text-gray-900">
            Plano Alimentar - {new Date(plan.created_at).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-500">
            Calorias: {plan.calories} kcal
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(plan.id)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDownload(plan)}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
