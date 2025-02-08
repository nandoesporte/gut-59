
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import WaterTracker from "./food-diary/WaterTracker";
import MealHistory from "./food-diary/MealHistory";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { History, Droplets, LineChart as LineChartIcon } from "lucide-react";

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
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [symptomData, setSymptomData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    daysLogged: 0,
    averageDiscomfort: 0,
  });

  useEffect(() => {
    fetchSavedMeals();
    fetchSymptomHistory();
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
          Acompanhe sua jornada registrando suas refeições e sintomas diários.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card className="bg-white shadow-sm border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-gray-900">Histórico Alimentar</h2>
              </div>
              <MealHistory savedMeals={savedMeals} />
            </CardContent>
          </Card>
          <WaterTracker />
        </div>

        <Card className="bg-white shadow-sm border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <LineChartIcon className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900">Progresso dos Sintomas</h2>
            </div>
            
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={symptomData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    stroke="#666"
                    tick={{ fill: '#666' }}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fill: '#666' }}
                    domain={[0, 10]}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="discomfort"
                    name="Nível de Desconforto"
                    stroke="#1976D2"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bloating"
                    name="Inchaço"
                    stroke="#2E7D32"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gas"
                    name="Gases"
                    stroke="#ED6C02"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="abdominalPain"
                    name="Dor Abdominal"
                    stroke="#D32F2F"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="nausea"
                    name="Náusea"
                    stroke="#9C27B0"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm text-gray-600">Dias Registrados</h4>
                <p className="text-2xl font-semibold text-primary-500">{stats.daysLogged}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm text-gray-600">Média de Desconforto</h4>
                <p className="text-2xl font-semibold text-primary-500">{stats.averageDiscomfort}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FoodDiary;

