
import React from "react";
import { DailyNutrition } from "../types";
import { MacroDistributionBar } from "./MacroDistributionBar";
import { PieChart } from "lucide-react";

interface DailyTotalsProps {
  totalNutrition: DailyNutrition;
  macroLabels?: Record<string, string>;
}

export const DailyTotals = ({ totalNutrition, macroLabels = {} }: DailyTotalsProps) => {
  if (!totalNutrition) return null;

  // Função para traduzir rótulos de macros
  const translateMacro = (macro: string): string => {
    return macroLabels[macro.toLowerCase()] || macro;
  };

  // Calcular percentuais de macronutrientes
  const totalCaloriesFromMacros =
    totalNutrition.protein * 4 +
    totalNutrition.carbs * 4 +
    totalNutrition.fats * 9;

  const proteinPercentage = Math.round(
    (totalNutrition.protein * 4 * 100) / totalCaloriesFromMacros
  );
  const carbsPercentage = Math.round(
    (totalNutrition.carbs * 4 * 100) / totalCaloriesFromMacros
  );
  const fatsPercentage = Math.round(
    (totalNutrition.fats * 9 * 100) / totalCaloriesFromMacros
  );

  return (
    <div className="border rounded-lg p-4 mt-6">
      <div className="flex items-center mb-4">
        <PieChart className="h-5 w-5 mr-2 text-purple-600" />
        <h4 className="font-medium text-lg">Totais Diários</h4>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{totalNutrition.calories}</div>
          <div className="text-xs text-gray-500">{translateMacro("calories")}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{totalNutrition.protein}g</div>
          <div className="text-xs text-gray-500">{translateMacro("protein")}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{totalNutrition.carbs}g</div>
          <div className="text-xs text-gray-500">{translateMacro("carbs")}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{totalNutrition.fats}g</div>
          <div className="text-xs text-gray-500">{translateMacro("fats")}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{totalNutrition.fiber}g</div>
          <div className="text-xs text-gray-500">{translateMacro("fiber")}</div>
        </div>
      </div>

      <MacroDistributionBar
        proteinPercentage={proteinPercentage}
        carbsPercentage={carbsPercentage}
        fatsPercentage={fatsPercentage}
      />

      <div className="grid grid-cols-3 text-center text-xs mt-2">
        <div className="text-blue-500">{translateMacro("protein")}: {proteinPercentage}%</div>
        <div className="text-green-500">{translateMacro("carbs")}: {carbsPercentage}%</div>
        <div className="text-orange-500">{translateMacro("fats")}: {fatsPercentage}%</div>
      </div>
    </div>
  );
};
