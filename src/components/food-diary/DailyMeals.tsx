
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Utensils } from "lucide-react";

interface ProtocolFood {
  id: string;
  name: string;
  food_group: string;
  phase: number;
}

interface SavedMeal {
  id: string;
  meal_type: string;
  description: string;
  meal_date: string;
  created_at: string;
  protocol_food: ProtocolFood;
}

interface DailyMealsProps {
  savedMeals: SavedMeal[];
}

const DailyMeals = ({ savedMeals }: DailyMealsProps) => {
  const [showSavedMeals, setShowSavedMeals] = useState(false);

  return (
    <Card className="bg-white shadow-sm border-none">
      <CardContent className="p-6">
        <button
          onClick={() => setShowSavedMeals(!showSavedMeals)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Refeições do Dia</h2>
          </div>
          {showSavedMeals ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
        
        {showSavedMeals && (
          <div className="mt-4 space-y-4">
            {savedMeals.length === 0 ? (
              <p className="text-gray-500 text-center">Nenhuma refeição registrada para este dia.</p>
            ) : (
              savedMeals.map((meal) => (
                <Card key={meal.id} className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {meal.meal_type === 'breakfast' && 'Café da manhã'}
                          {meal.meal_type === 'lunch' && 'Almoço'}
                          {meal.meal_type === 'dinner' && 'Jantar'}
                          {meal.meal_type === 'snack' && 'Lanche'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {meal.protocol_food?.name}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(new Date(meal.created_at), 'HH:mm')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyMeals;
