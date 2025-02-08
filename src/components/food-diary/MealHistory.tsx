
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { History } from "lucide-react";

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

interface MealHistoryProps {
  savedMeals: SavedMeal[];
}

const MealHistory = ({ savedMeals }: MealHistoryProps) => {
  return (
    <Card className="bg-white shadow-sm border-none">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Histórico Alimentar</h2>
          </div>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <div className="space-y-4">
              {savedMeals.map((meal) => (
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
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            {meal.protocol_food?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Grupo: {meal.protocol_food?.food_group}
                          </p>
                          <p className="text-xs text-gray-500">
                            Fase: {meal.protocol_food?.phase}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">
                          {format(new Date(meal.created_at), 'HH:mm')}
                        </span>
                        <p className="text-xs text-gray-500">
                          {format(new Date(meal.meal_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default MealHistory;
