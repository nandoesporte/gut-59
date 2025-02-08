
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { LineChart as LineChartIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

const Progress = () => {
  const { toast } = useToast();
  const [symptomData, setSymptomData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    daysLogged: 0,
    averageDiscomfort: 0,
  });

  useEffect(() => {
    fetchSymptomHistory();
  }, []);

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

      // Calculate statistics and convert to number
      const totalDiscomfort = data.reduce((sum: number, item: any) => sum + (item.discomfort_level || 0), 0);
      const avgDiscomfort = data.length > 0 ? Number((totalDiscomfort / data.length).toFixed(1)) : 0;
      
      setStats({
        daysLogged: data.length,
        averageDiscomfort: avgDiscomfort,
      });

    } catch (error) {
      console.error('Error fetching symptom history:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar seu histórico de sintomas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center space-x-2">
        <LineChartIcon className="w-6 h-6 text-primary-500" />
        <CardTitle className="text-2xl text-primary-500">
          Seu Progresso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
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
          <div className="grid grid-cols-2 gap-4">
            <StatCard title="Dias Registrados" value={stats.daysLogged.toString()} />
            <StatCard title="Média de Desconforto" value={stats.averageDiscomfort.toString()} />
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Legenda</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#1976D2]" />
                <span className="text-sm text-gray-600">Nível de Desconforto</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#2E7D32]" />
                <span className="text-sm text-gray-600">Inchaço</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#ED6C02]" />
                <span className="text-sm text-gray-600">Gases</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#D32F2F]" />
                <span className="text-sm text-gray-600">Dor Abdominal</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#9C27B0]" />
                <span className="text-sm text-gray-600">Náusea</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StatCard = ({ title, value }: { title: string; value: string }) => (
  <div className="p-4 bg-gray-50 rounded-lg">
    <h4 className="text-sm text-gray-600">{title}</h4>
    <p className="text-2xl font-semibold text-primary-500">{value}</p>
  </div>
);

export default Progress;
