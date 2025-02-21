import React, { useState } from 'react';
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
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MealsListProps {
  meals: Meal;
}

const MealsList = ({ meals }: MealsListProps) => {
  const isMobile = useIsMobile();
  const [visibleSections, setVisibleSections] = useState<string[]>(['carboidratos']);
  const [visibleCombinations, setVisibleCombinations] = useState<string[]>(['opcao1']);

  const toggleSection = (section: string) => {
    setVisibleSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleCombination = (combination: string) => {
    setVisibleCombinations(prev =>
      prev.includes(combination)
        ? prev.filter(c => c !== combination)
        : [...prev, combination]
    );
  };

  const renderMealContent = (meal: string[]) => {
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
          sections[currentSection].push(item);
        }
      });

      const sectionTitles = {
        carboidratos: "Carboidratos",
        proteinas: "Proteínas",
        gorduras: "Gorduras",
        frutas: "Frutas"
      };

      if (isMobile) {
        return (
          <div className="space-y-4">
            {Object.entries(sections).map(([key, items]) => (
              <div key={key} className="border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  className="w-full flex justify-between items-center p-4 hover:bg-gray-50"
                  onClick={() => toggleSection(key)}
                >
                  <span className="font-semibold text-gray-900">
                    {key === 'carboidratos' ? 'Carbos' : sectionTitles[key as keyof typeof sectionTitles]}
                  </span>
                  {visibleSections.includes(key) ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
                {visibleSections.includes(key) && (
                  <div className="p-4 bg-white">
                    <ul className="space-y-2">
                      {items.map((item, index) => (
                        <li key={index} className="text-gray-700 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-primary-300 mr-3" />
                          {item.replace(/carboidrato/gi, "carbo")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Carbos</TableHead>
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
                    {sections.carboidratos[index]?.replace(/carboidrato/gi, "carbo") || ''}
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

    if (meal.some(item => item.startsWith("Opção"))) {
      const combinations: { [key: string]: string[] } = {};
      let currentOption = '';

      meal.forEach(item => {
        if (item.startsWith("Opção")) {
          currentOption = `opcao${item.match(/\d+/)?.[0] || ''}`;
          combinations[currentOption] = [item];
        } else if (currentOption && item) {
          combinations[currentOption].push(item);
        }
      });

      if (isMobile) {
        return (
          <div className="space-y-4">
            {Object.entries(combinations).map(([key, items]) => (
              <div key={key} className="border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  className="w-full flex justify-between items-center p-4 hover:bg-primary-50"
                  onClick={() => toggleCombination(key)}
                >
                  <span className="font-semibold text-primary-700">
                    {items[0]}
                  </span>
                  {visibleCombinations.includes(key) ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
                {visibleCombinations.includes(key) && (
                  <div className="p-4 bg-white">
                    <ul className="space-y-2">
                      {items.slice(1).map((item, index) => (
                        <li key={index} className="text-gray-700 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-primary-300 mr-3" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.values(combinations).map((items, index) => (
            <Card key={index} className="p-4">
              <h6 className="font-semibold text-primary-700 mb-3">{items[0]}</h6>
              <ul className="space-y-2">
                {items.slice(1).map((item, idx) => (
                  <li key={idx} className="text-gray-700 flex items-center">
                    <div className="w-2 h-2 rounded-full bg-primary-300 mr-3" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      );
    }

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
