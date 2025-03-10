
import React from "react";
import { Calendar } from "lucide-react";

interface MealPlanHeaderProps {
  calories?: number;
  protein?: number;
}

export const MealPlanHeader: React.FC<MealPlanHeaderProps> = ({
  calories,
  protein
}) => {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold flex items-center flex-wrap">
        <Calendar className="h-6 w-6 mr-2 text-green-600 flex-shrink-0" />
        <span>Seu Plano Alimentar Personalizado</span>
      </h2>
      {calories && (
        <p className="text-lg sm:text-xl text-gray-500 mt-1">
          {calories} kcal diárias {protein && `• ${protein}g proteína`}
        </p>
      )}
    </div>
  );
};
