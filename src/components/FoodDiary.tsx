
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Plus, History, List } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MealLogger from "./food-diary/MealLogger";
import WaterTracker from "./food-diary/WaterTracker";
import DailyMeals from "./food-diary/DailyMeals";
import MealHistory from "./food-diary/MealHistory";
import ProgressChart from "./food-diary/ProgressChart";

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
  const [date, setDate] = useState<Date>(new Date());
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [symptomData, setSymptomData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    daysLogged: 0,
    averageDiscomfort: 0,
  });

  useEffect(() => {
    fetchProtocolFoods();
    fetchSavedMeals();
    fetchSymptomHistory();
  }, [date]);

  const fetchProtocolFoods = async () => {
    try {
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('*')
        .order('food_group');

      if (error) throw error;
      setProtocolFoods(data || []);
    } catch (error) {
      console.error('Error fetching protocol foods:', error);
    }
  };

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

  const fetchSymptomHistory = async () => {
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

      const { data, error } = await supabase
        .from('symptoms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedData = data.map(item => ({
        date: format(new Date(item.created_at), 'dd/MM'),
        discomfort: item.discomfort_level,
        bloating: item.has_bloating ? 1 : 0,
        gas: item.has_gas ? 1 : 0,
        abdominalPain: item.has_abdominal_pain ? 1 : 0,
        nausea: item.has_nausea ? 1 : 0,
      }));

      setSymptomData(formattedData);

      const totalDiscomfort = data.reduce((sum: number, item: any) => sum + (item.discomfort_level || 0), 0);
      const avgDiscomfort = data.length > 0 ? Number((totalDiscomfort / data.length).toFixed(1)) : 0;
      
      setStats({
        daysLogged: data.length,
        averageDiscomfort: avgDiscomfort,
      });

    } catch (error) {
      console.error('Error fetching symptom history:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700 mb-2">Diário Alimentar</h1>
        <p className="text-primary-600">
          Acompanhe sua jornada de modulação intestinal registrando suas refeições diárias.
        </p>
      </div>

      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="register" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Registrar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Progresso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <MealLogger
              date={date}
              setDate={setDate}
              protocolFoods={protocolFoods}
              onMealLogged={fetchSavedMeals}
            />
            <div className="space-y-6">
              <WaterTracker />
              <DailyMeals savedMeals={savedMeals} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <MealHistory savedMeals={savedMeals} />
        </TabsContent>

        <TabsContent value="progress">
          <ProgressChart symptomData={symptomData} stats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FoodDiary;
