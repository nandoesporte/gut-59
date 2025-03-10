
import { formatInTimeZone } from "date-fns-tz";
import { Utensils, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Timezone configuration
const BRAZIL_TIMEZONE = "America/Sao_Paulo";

interface SavedMeal {
  id: string;
  meal_type: string;
  meal_date: string | null;
  created_at: string | null;
  photo_url: string | null;
  protocol_phase: number | null;
}

interface DailyMealsProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

const DailyMeals = ({ date, onDateChange }: DailyMealsProps) => {
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [showSavedMeals, setShowSavedMeals] = useState(true);

  useEffect(() => {
    fetchSavedMeals();
  }, [date]);

  const fetchSavedMeals = async () => {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('meal_date', formatInTimeZone(date, BRAZIL_TIMEZONE, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedMeals(data || []);
    } catch (error) {
      console.error('Error fetching saved meals:', error);
    }
  };

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
                  {formatInTimeZone(date, BRAZIL_TIMEZONE, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && onDateChange(newDate)}
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
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {getMealTypeDisplay(meal.meal_type)}
                          </h3>
                          {meal.protocol_phase && (
                            <p className="text-sm text-gray-600">
                              Fase {meal.protocol_phase}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {meal.created_at && formatInTimeZone(new Date(meal.created_at), BRAZIL_TIMEZONE, 'HH:mm')}
                        </span>
                      </div>
                      {meal.photo_url && (
                        <img
                          src={meal.photo_url}
                          alt="Foto da refeição"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      )}
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
