
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { List } from "lucide-react";

interface ProgressChartProps {
  symptomData: any[];
  stats: {
    daysLogged: number;
    averageDiscomfort: number;
  };
}

const ProgressChart = ({ symptomData, stats }: ProgressChartProps) => {
  return (
    <Card className="bg-white shadow-sm border-none">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Seu Progresso</h2>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm text-gray-600">Dias Registrados</h4>
              <p className="text-2xl font-semibold text-primary-500">{stats.daysLogged}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm text-gray-600">Média de Desconforto</h4>
              <p className="text-2xl font-semibold text-primary-500">{stats.averageDiscomfort}</p>
            </div>
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

export default ProgressChart;
