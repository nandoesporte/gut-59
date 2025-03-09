
import React from "react";
import { DailyNutrition } from "../types";
import { PieChart, Pie, ResponsiveContainer, Cell, Legend, Tooltip } from "recharts";

interface DailyTotalsProps {
  totalNutrition: DailyNutrition;
  macroLabels?: Record<string, string>;
}

export const DailyTotals = ({ totalNutrition, macroLabels = {} }: DailyTotalsProps) => {
  // Função para traduzir macronutrientes
  const translateMacro = (macro: string): string => {
    const translated = macroLabels[macro.toLowerCase()];
    return translated ? 
      translated.charAt(0).toUpperCase() + translated.slice(1) : 
      macro.charAt(0).toUpperCase() + macro.slice(1);
  };

  const macros = [
    { name: translateMacro("Protein"), value: Number(totalNutrition?.protein || 0), color: "#4caf50" },
    { name: translateMacro("Carbs"), value: Number(totalNutrition?.carbs || 0), color: "#ff9800" },
    { name: translateMacro("Fats"), value: Number(totalNutrition?.fats || 0), color: "#f44336" }
  ];

  return (
    <div className="border rounded-lg p-4 mt-4">
      <h4 className="font-medium text-lg mb-3">Totais Diários</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Calorias Totais:</span>
            <span className="font-medium">{totalNutrition?.calories || 0} kcal</span>
          </div>
          <div className="flex justify-between">
            <span>Proteínas:</span>
            <span className="font-medium">{totalNutrition?.protein || 0}g</span>
          </div>
          <div className="flex justify-between">
            <span>Carboidratos:</span>
            <span className="font-medium">{totalNutrition?.carbs || 0}g</span>
          </div>
          <div className="flex justify-between">
            <span>Gorduras:</span>
            <span className="font-medium">{totalNutrition?.fats || 0}g</span>
          </div>
          <div className="flex justify-between">
            <span>Fibras:</span>
            <span className="font-medium">{totalNutrition?.fiber || 0}g</span>
          </div>
        </div>
        
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={macros}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {macros.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}g`, ""]}
                labelFormatter={(index) => macros[index].name}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
