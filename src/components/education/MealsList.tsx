
import React from 'react';
import { Meal } from '@/types/education';
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MealsListProps {
  meals: Meal;
}

const MealsList = ({ meals }: MealsListProps) => {
  const renderMealContent = (meal: string[]) => {
    // Check if the meal content looks like a table (has specific markers)
    if (meal.some(item => item.includes("Carboidratos:") || item.includes("Proteínas:"))) {
      const sections: { [key: string]: string[] } = {
        carboidratos: [],
        proteinas: [],
        gorduras: [],
        frutas: [],
      };
      
      let currentSection = '';
      
      meal.forEach(item => {
        if (item.includes("Carboidratos:")) {
          currentSection = 'carboidratos';
        } else if (item.includes("Proteínas:")) {
          currentSection = 'proteinas';
        } else if (item.includes("Gorduras:")) {
          currentSection = 'gorduras';
        } else if (item.includes("Frutas:")) {
          currentSection = 'frutas';
        } else if (item && currentSection && !item.startsWith("-")) {
          sections[currentSection].push(item.replace("- ", ""));
        }
      });

      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Carboidratos</TableHead>
                <TableHead className="w-1/4">Proteínas</TableHead>
                <TableHead className="w-1/4">Gorduras</TableHead>
                <TableHead className="w-1/4">Frutas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: Math.max(
                sections.carboidratos.length,
                sections.proteinas.length,
                sections.gorduras.length,
                sections.frutas.length
              ) }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {sections.carboidratos[index] || ''}
                  </TableCell>
                  <TableCell>{sections.proteinas[index] || ''}</TableCell>
                  <TableCell>{sections.gorduras[index] || ''}</TableCell>
                  <TableCell>{sections.frutas[index] || ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    // For regular meal content, render as before
    return (
      <table className="w-full">
        <tbody>
          {meal.map((item, i) => (
            <tr key={i} className="border-b last:border-0 border-gray-100">
              <td className="py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary-300 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="space-y-6">
      {Object.entries(meals).map(([time, meal]) => (
        <Card key={time} className="overflow-hidden">
          <div className="bg-primary-50 px-4 py-2 border-b border-primary-100">
            <h5 className="font-semibold text-primary-700">{time}</h5>
          </div>
          <div className="p-4">
            {renderMealContent(meal)}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MealsList;
