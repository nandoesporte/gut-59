
import React from 'react';
import { Meal } from '@/types/education';

interface MealsListProps {
  meals: Meal;
}

const MealsList = ({ meals }: MealsListProps) => {
  return (
    <div className="space-y-4">
      {Object.entries(meals).map(([time, meal]) => (
        <div key={time} className="space-y-2">
          <h5 className="font-medium text-gray-700">{time}</h5>
          <div className="pl-4 text-gray-600">
            {meal.map((item, i) => (
              <div
                key={i}
                className="flex items-center space-x-2 py-1"
              >
                <div className="w-2 h-2 rounded-full bg-primary-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MealsList;
