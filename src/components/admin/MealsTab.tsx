
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DatabaseMeal } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export const MealsTab = () => {
  const { data: meals, isLoading } = useQuery({
    queryKey: ['admin-meals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('meal_date', { ascending: false });
      
      if (error) throw error;
      return data as DatabaseMeal[];
    },
  });

  const getMealTypeDisplay = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return 'Café da manhã';
      case 'lunch':
        return 'Almoço';
      case 'dinner':
        return 'Jantar';
      case 'snack':
        return 'Lanche';
      default:
        return mealType;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center space-x-2">
          <CalendarDays className="w-6 h-6 text-primary-500" />
          <CardTitle className="text-xl text-primary-500">
            Histórico Alimentar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {isLoading ? (
              <div className="py-4 text-center">Carregando...</div>
            ) : meals?.length === 0 ? (
              <div className="py-4 text-center">Nenhuma refeição registrada.</div>
            ) : (
              meals?.map((meal) => (
                <div key={meal.id} className="py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {getMealTypeDisplay(meal.meal_type || '')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {meal.meal_date && format(new Date(meal.meal_date), 'dd/MM/yyyy')}
                      </p>
                      {meal.protocol_phase && (
                        <p className="text-sm text-gray-600">
                          Fase {meal.protocol_phase}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {meal.custom_food && (
                        <p className="text-gray-700">{meal.custom_food}</p>
                      )}
                      {meal.description && (
                        <p className="text-sm text-gray-600">{meal.description}</p>
                      )}
                    </div>
                  </div>
                  {meal.photo_url && (
                    <img
                      src={meal.photo_url}
                      alt="Foto da refeição"
                      className="mt-4 w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
