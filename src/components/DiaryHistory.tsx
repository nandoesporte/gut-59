
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface MealHistoryItem {
  id: string;
  meal_date: string;
  meal_type: string;
  description: string;
}

interface WaterIntakeItem {
  id: string;
  created_at: string;
  amount_ml: number;
}

const DiaryHistory = () => {
  const [mealHistory, setMealHistory] = useState<MealHistoryItem[]>([]);
  const [waterHistory, setWaterHistory] = useState<WaterIntakeItem[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Fetch meal history
      const { data: mealData } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .order('meal_date', { ascending: false });

      if (mealData) setMealHistory(mealData);

      // Fetch water intake history
      const { data: waterData } = await supabase
        .from('water_intake')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (waterData) setWaterHistory(waterData);

    } catch (error) {
      console.error('Error fetching history:', error);
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
            {mealHistory.map((meal) => (
              <div key={meal.id} className="py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {meal.meal_type}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(meal.meal_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <p className="text-gray-700">{meal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center space-x-2">
          <Droplets className="w-6 h-6 text-primary-500" />
          <CardTitle className="text-xl text-primary-500">
            Histórico de Consumo de Água
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {waterHistory.map((water) => (
              <div key={water.id} className="py-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    {format(new Date(water.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                  <p className="font-semibold text-gray-900">
                    {water.amount_ml}ml
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiaryHistory;
