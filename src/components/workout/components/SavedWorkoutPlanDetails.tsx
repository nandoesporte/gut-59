
import React from "react";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorkoutPlan } from "../types/workout-plan";
import { Dumbbell, Calendar, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CurrentWorkoutPlan } from "./CurrentWorkoutPlan";

interface SavedWorkoutPlanDetailsProps {
  plan: WorkoutPlan;
  isOpen: boolean;
  onClose: () => void;
}

export const SavedWorkoutPlanDetails = ({ 
  plan, 
  isOpen, 
  onClose 
}: SavedWorkoutPlanDetailsProps) => {
  
  if (!plan || !isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Plano de Treino
          </DialogTitle>
          <DialogDescription>
            <div className="flex flex-wrap gap-3 mt-2">
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(plan.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>{plan.goal}</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <CurrentWorkoutPlan plan={plan} />
        </div>
        
        <DialogFooter className="sm:justify-center gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
