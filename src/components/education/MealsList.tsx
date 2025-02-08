
import React from 'react';
import { Meal } from '@/types/education';
import { Card } from "@/components/ui/card";

interface MealsListProps {
  meals: Meal;
}

const MealsList = ({ meals }: MealsListProps) => {
  return (
    <div className="space-y-6">
      {Object.entries(meals).map(([time, meal]) => (
        <Card key={time} className="overflow-hidden">
          <div className="bg-primary-50 px-4 py-2 border-b border-primary-100">
            <h5 className="font-semibold text-primary-700">{time}</h5>
          </div>
          <div className="p-4">
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
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MealsList;
