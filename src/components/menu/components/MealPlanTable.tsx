
import React from "react";
import { MealPlan } from "../types";

interface MealPlanTableProps {
  mealPlan: MealPlan;
}

export const MealPlanTable = ({ mealPlan }: MealPlanTableProps) => {
  if (!mealPlan || !mealPlan.weeklyPlan) {
    return <div>Não há dados disponíveis para exibir</div>;
  }

  const dayNames: Record<string, string> = {
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
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 bg-gray-50">Dia</th>
            <th className="border p-2 bg-gray-50">Calorias</th>
            <th className="border p-2 bg-gray-50">Proteína (g)</th>
            <th className="border p-2 bg-gray-50">Carboidratos (g)</th>
            <th className="border p-2 bg-gray-50">Gorduras (g)</th>
            <th className="border p-2 bg-gray-50">Fibras (g)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(mealPlan.weeklyPlan).map(([day, dayPlan]) => (
            <tr key={day}>
              <td className="border p-2">{dayNames[day] || day}</td>
              <td className="border p-2 text-center">{dayPlan.dailyTotals.calories}</td>
              <td className="border p-2 text-center">{dayPlan.dailyTotals.protein}</td>
              <td className="border p-2 text-center">{dayPlan.dailyTotals.carbs}</td>
              <td className="border p-2 text-center">{dayPlan.dailyTotals.fats}</td>
              <td className="border p-2 text-center">{dayPlan.dailyTotals.fiber}</td>
            </tr>
          ))}
          <tr className="bg-green-50 font-medium">
            <td className="border p-2">Média Semanal</td>
            <td className="border p-2 text-center">{mealPlan.weeklyTotals.averageCalories}</td>
            <td className="border p-2 text-center">{mealPlan.weeklyTotals.averageProtein}</td>
            <td className="border p-2 text-center">{mealPlan.weeklyTotals.averageCarbs}</td>
            <td className="border p-2 text-center">{mealPlan.weeklyTotals.averageFats}</td>
            <td className="border p-2 text-center">{mealPlan.weeklyTotals.averageFiber}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
