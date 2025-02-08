
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronDown, ChevronUp, Utensils, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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

const FoodDiary = () => {
  const { toast } = useToast();
  const [waterPercentage, setWaterPercentage] = useState(55);
  const [date, setDate] = useState<Date>(new Date());
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [showSavedMeals, setShowSavedMeals] = useState(false);

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

  const handleAddWater = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado. Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('water_intake')
        .insert({
          user_id: user.id,
          amount_ml: 200,
        });

      if (error) throw error;

      setWaterPercentage(prev => Math.min(100, prev + 5));

      toast({
        title: "Água registrada",
        description: "200ml de água registrados com sucesso.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível registrar a água. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700 mb-2">Diário Alimentar</h1>
        <p className="text-primary-600">
          Histórico de refeições e consumo de água.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white shadow-sm border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-gray-900">Refeições do Dia</h2>
              </div>
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
            </div>
            
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
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900">Ingestão de água</h2>
            </div>
            <div className="w-32 h-32 mx-auto">
              <CircularProgressbar
                value={waterPercentage}
                text={`${waterPercentage}%`}
                styles={buildStyles({
                  textSize: '16px',
                  pathColor: '#34D399',
                  textColor: '#34D399',
                  trailColor: '#E5E7EB',
                })}
              />
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleAddWater}
                className="bg-primary-50 hover:bg-primary-100 text-primary-500"
                variant="ghost"
              >
                <span className="text-sm">+ 200ml</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FoodDiary;

