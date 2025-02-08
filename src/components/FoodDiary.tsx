
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { History } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import MealHistory from "./food-diary/MealHistory";
import WaterTracker from "./food-diary/WaterTracker";
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
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [symptomData, setSymptomData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    daysLogged: 0,
    averageDiscomfort: 0,
  });

  useEffect(() => {
    fetchSavedMeals();
    fetchSymptomHistory();
  }, []);

  const fetchSavedMeals = async () => {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select(`
          *,
          protocol_food:protocol_food_id (*)
        `)
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
        <h1 className="text-2xl font-bold text-primary-700 mb-2">Histórico Alimentar</h1>
        <p className="text-primary-600">
          Acompanhe seu histórico alimentar e progresso dos sintomas.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <MealHistory savedMeals={savedMeals} />
          <WaterTracker />
        </div>
        <div>
          <ProgressChart symptomData={symptomData} stats={stats} />
        </div>
      </div>
    </div>
  );
};

export default FoodDiary;
