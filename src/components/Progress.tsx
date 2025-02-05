
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { LineChartIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const Progress = () => {
  const [symptomData, setSymptomData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    daysLogged: 0,
    averageDiscomfort: 0
  });

  useEffect(() => {
    fetchSymptomData();
  }, []);

  const fetchSymptomData = async () => {
    try {
      const { data, error } = await supabase
        .from('symptoms')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedData = data.map(item => ({
          date: new Date(item.created_at).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit' 
          }),
          discomfort: item.discomfort_level
        }));

        setSymptomData(formattedData);

        // Calculate stats
        const uniqueDays = new Set(formattedData.map(item => item.date)).size;
        const avgDiscomfort = formattedData.reduce((acc, curr) => acc + curr.discomfort, 0) / formattedData.length;

        setStats({
          daysLogged: uniqueDays,
          averageDiscomfort: Number(avgDiscomfort.toFixed(1))
        });
      }
    } catch (error) {
      console.error('Error fetching symptom data:', error);
    }
  };

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
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="discomfort"
                  stroke="#1976D2"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard title="Dias Registrados" value={stats.daysLogged.toString()} />
            <StatCard title="Média de Sintomas" value={stats.averageDiscomfort.toString()} />
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
