
import { useState } from "react";
import { useLocation } from "react-router-dom";
import ProgressChart from "@/components/Progress";
import DiaryHistory from "@/components/DiaryHistory";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronDown, ChevronUp, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface SavedMeal {
  id: string;
  meal_type: string;
  description: string;
  meal_date: string;
  created_at: string;
  protocol_food: {
    id: string;
    name: string;
    food_group: string;
    phase: number;
  };
}

const Progress = () => {
  const location = useLocation();
  const [date, setDate] = useState<Date>(new Date());
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [showSavedMeals, setShowSavedMeals] = useState(true);

  useEffect(() => {
    fetchSavedMeals();
  }, [date]);

  const fetchSavedMeals = async () => {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select(`
          *,
          protocol_food:protocol_food_id (*)
        `)
        .eq('meal_date', format(date, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedMeals(data || []);
    } catch (error) {
      console.error('Error fetching saved meals:', error);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-8">
        <ProgressChart />
        <DiaryHistory />
        
        {/* Daily Meals Section */}
        <Card className="bg-white shadow-sm border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-gray-900">Refeições do Dia</h2>
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(date) => date && setDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSavedMeals(!showSavedMeals)}
                >
                  {showSavedMeals ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
            
            {showSavedMeals && (
              <div className="space-y-4">
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
      </div>
    </Layout>
  );
};

export default Progress;

