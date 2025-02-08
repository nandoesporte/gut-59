
import { useState } from "react";
import { useLocation } from "react-router-dom";
import ProgressChart from "@/components/Progress";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronDown, ChevronUp, Droplets, Utensils } from "lucide-react";
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

interface WaterIntake {
  id: string;
  amount_ml: number;
  created_at: string;
}

const Progress = () => {
  const location = useLocation();
  const [date, setDate] = useState<Date>(new Date());
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [waterIntake, setWaterIntake] = useState<WaterIntake[]>([]);
  const [showSavedMeals, setShowSavedMeals] = useState(true);
  const [showWaterIntake, setShowWaterIntake] = useState(true);

  useEffect(() => {
    fetchSavedMeals();
    fetchWaterIntake();
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

  const fetchWaterIntake = async () => {
    try {
      const { data, error } = await supabase
        .from('water_intake')
        .select('*')
        .eq('created_at::date', format(date, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWaterIntake(data || []);
    } catch (error) {
      console.error('Error fetching water intake:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
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

      {/* Water Intake History */}
      <Card className="bg-white shadow-sm border-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900">Consumo de Água</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowWaterIntake(!showWaterIntake)}
            >
              {showWaterIntake ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>

          {showWaterIntake && (
            <div className="space-y-4">
              {waterIntake.length === 0 ? (
                <p className="text-gray-500 text-center">Nenhum registro de consumo de água para este dia.</p>
              ) : (
                waterIntake.map((water) => (
                  <Card key={water.id} className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {format(new Date(water.created_at), 'HH:mm')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-primary-500" />
                          <span className="font-medium text-gray-900">{water.amount_ml}ml</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              {waterIntake.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Total do dia:</span>
                    <span className="font-semibold text-primary-500">
                      {waterIntake.reduce((total, water) => total + (water.amount_ml || 0), 0)}ml
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ProgressChart />
    </div>
  );
};

export default Progress;
