
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MealPlanTable } from "./MealPlanTable";
import { MealPlan } from "../types";

interface WeeklyOverviewProps {
  mealPlan: MealPlan;
  mealTypeLabels: Record<string, string>;
  macroLabels: Record<string, string>;
}

export const WeeklyOverview: React.FC<WeeklyOverviewProps> = ({
  mealPlan,
  mealTypeLabels,
  macroLabels
}) => {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <h3 className="font-bold text-lg mb-4">Visão Geral Semanal</h3>
        <MealPlanTable 
          mealPlan={mealPlan} 
          mealTypeLabels={mealTypeLabels} 
          macroLabels={macroLabels}
        />
      </CardContent>
    </Card>
  );
};
