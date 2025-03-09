
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
      <h2 className="text-xl font-bold flex items-center">
        <Calendar className="h-5 w-5 mr-2 text-green-600" />
        Seu Plano Alimentar Personalizado
      </h2>
      {calories && (
        <p className="text-sm text-gray-500 mt-1">
          {calories} kcal diárias {protein && `• ${protein}g proteína`}
        </p>
      )}
    </div>
  );
};
