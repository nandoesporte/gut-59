
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MealPlan } from "../types";

interface MealPlanTableProps {
  mealPlan: MealPlan;
  mealTypeLabels?: Record<string, string>;
  macroLabels?: Record<string, string>;
}

export const MealPlanTable = ({ mealPlan, mealTypeLabels = {}, macroLabels = {} }: MealPlanTableProps) => {
  if (!mealPlan || !mealPlan.weeklyPlan) {
    return <div className="text-gray-500">Dados do plano alimentar indisponíveis</div>;
  }

  const days = Object.keys(mealPlan.weeklyPlan);
  if (days.length === 0) return null;

  const weekdayLabels: Record<string, string> = {
    monday: "Segunda",
    tuesday: "Terça",
    wednesday: "Quarta",
    thursday: "Quinta",
    friday: "Sexta",
    saturday: "Sábado",
    sunday: "Domingo"
  };

  // Função para traduzir nomes de dias
  const translateDayName = (dayKey: string, dayName?: string): string => {
    // Primeiro tentar o nome do dia
    if (dayName) {
      const translations: Record<string, string> = {
        "Monday": "Segunda-feira",
        "Tuesday": "Terça-feira",
        "Wednesday": "Quarta-feira",
        "Thursday": "Quinta-feira",
        "Friday": "Sexta-feira",
        "Saturday": "Sábado",
        "Sunday": "Domingo"
      };
      if (translations[dayName]) return translations[dayName];
    }
    
    // Caso contrário, usar a chave do dia
    return weekdayLabels[dayKey] || dayKey;
  };

  // Função para traduzir tipos de refeição
  const translateMealType = (mealType: string): string => {
    return mealTypeLabels[mealType] || mealType;
  };

  // Função para traduzir macronutrientes
  const translateMacro = (macro: string): string => {
    return macroLabels[macro.toLowerCase()] || macro;
  };

  const mealTypes = ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner", "eveningSnack"];
  const visibleMealTypes = mealTypes.filter(type => 
    days.some(day => mealPlan.weeklyPlan[day]?.meals?.[type])
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Dia</TableHead>
            <TableHead>{translateMacro("calories")}</TableHead>
            <TableHead>{translateMacro("protein")}</TableHead>
            <TableHead>{translateMacro("carbs")}</TableHead>
            <TableHead>{translateMacro("fats")}</TableHead>
            <TableHead>{translateMacro("fiber")}</TableHead>
            <TableHead>Refeições</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.map(day => {
            const dayPlan = mealPlan.weeklyPlan[day];
            if (!dayPlan) return null;

            const mealCount = visibleMealTypes.filter(
              type => dayPlan.meals && dayPlan.meals[type]
            ).length;

            return (
              <TableRow key={day}>
                <TableCell className="font-medium">
                  {translateDayName(day, dayPlan.dayName)}
                </TableCell>
                <TableCell>{dayPlan.dailyTotals?.calories || 0} kcal</TableCell>
                <TableCell>{dayPlan.dailyTotals?.protein || 0}g</TableCell>
                <TableCell>{dayPlan.dailyTotals?.carbs || 0}g</TableCell>
                <TableCell>{dayPlan.dailyTotals?.fats || 0}g</TableCell>
                <TableCell>{dayPlan.dailyTotals?.fiber || 0}g</TableCell>
                <TableCell>{mealCount} refeições</TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-muted/50">
            <TableCell className="font-medium">Média</TableCell>
            <TableCell>{mealPlan.weeklyTotals?.averageCalories || 0} kcal</TableCell>
            <TableCell>{mealPlan.weeklyTotals?.averageProtein || 0}g</TableCell>
            <TableCell>{mealPlan.weeklyTotals?.averageCarbs || 0}g</TableCell>
            <TableCell>{mealPlan.weeklyTotals?.averageFats || 0}g</TableCell>
            <TableCell>{mealPlan.weeklyTotals?.averageFiber || 0}g</TableCell>
            <TableCell>-</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
