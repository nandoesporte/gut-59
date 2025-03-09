
import React from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MealPlan } from "../types";

interface MealPlanTableProps {
  mealPlan: MealPlan;
  mealTypeLabels?: Record<string, string>;
  macroLabels?: Record<string, string>;
}

export const MealPlanTable = ({ mealPlan, mealTypeLabels = {}, macroLabels = {} }: MealPlanTableProps) => {
  const days = Object.keys(mealPlan.weeklyPlan);
  const dayLabels: Record<string, string> = {
    monday: "Segunda",
    tuesday: "Terça",
    wednesday: "Quarta",
    thursday: "Quinta",
    friday: "Sexta",
    saturday: "Sábado",
    sunday: "Domingo"
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption>Resumo semanal do plano alimentar</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Dia</TableHead>
            <TableHead>Calorias</TableHead>
            <TableHead>Proteína</TableHead>
            <TableHead>Carboidratos</TableHead>
            <TableHead>Gorduras</TableHead>
            <TableHead>Fibras</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.map((day) => {
            const dayPlan = mealPlan.weeklyPlan[day];
            if (!dayPlan || !dayPlan.dailyTotals) return null;
            
            return (
              <TableRow key={day}>
                <TableCell className="font-medium">{dayLabels[day] || day}</TableCell>
                <TableCell>{dayPlan.dailyTotals.calories} kcal</TableCell>
                <TableCell>{dayPlan.dailyTotals.protein}g</TableCell>
                <TableCell>{dayPlan.dailyTotals.carbs}g</TableCell>
                <TableCell>{dayPlan.dailyTotals.fats}g</TableCell>
                <TableCell>{dayPlan.dailyTotals.fiber}g</TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-muted/50">
            <TableCell className="font-medium">Média</TableCell>
            <TableCell className="font-bold">{mealPlan.weeklyTotals.averageCalories} kcal</TableCell>
            <TableCell className="font-bold">{mealPlan.weeklyTotals.averageProtein}g</TableCell>
            <TableCell className="font-bold">{mealPlan.weeklyTotals.averageCarbs}g</TableCell>
            <TableCell className="font-bold">{mealPlan.weeklyTotals.averageFats}g</TableCell>
            <TableCell className="font-bold">{mealPlan.weeklyTotals.averageFiber}g</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
