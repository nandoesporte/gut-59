
import React from "react";
import { WorkoutPlan } from "../types/workout-plan";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkoutPlanHeader } from "./WorkoutPlanHeader";
import { Separator } from "@/components/ui/separator";
import { WorkoutPlanDetailed } from "./WorkoutPlanDetailed";

interface CurrentWorkoutPlanProps {
  plan: WorkoutPlan;
  formatGoal?: (goal: string) => string;
}

export const CurrentWorkoutPlan = ({ plan, formatGoal }: CurrentWorkoutPlanProps) => {
  // Format goal name if formatter is provided, otherwise return the original
  const getFormattedGoal = () => {
    if (formatGoal && plan.goal) {
      return formatGoal(plan.goal);
    }
    
    // Default formatting if no formatter provided
    if (plan.goal) {
      return plan.goal.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return plan.goal || "Personalizado";
  };

  return (
    <Card className="border border-primary/10">
      <WorkoutPlanHeader 
        goal={getFormattedGoal()}
        startDate={plan.start_date}
        endDate={plan.end_date}
      />
      <Separator />
      <CardContent className="p-0 overflow-hidden">
        <ScrollArea className="h-auto max-h-[70vh]">
          <WorkoutPlanDetailed plan={plan} />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
