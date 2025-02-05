import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";

const Progress = () => {
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
                <YAxis />
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
            <StatCard title="Dias Registrados" value="14" />
            <StatCard title="Média de Sintomas" value="3.5" />
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

const symptomData = [
  { date: "01/03", discomfort: 7 },
  { date: "02/03", discomfort: 6 },
  { date: "03/03", discomfort: 5 },
  { date: "04/03", discomfort: 4 },
  { date: "05/03", discomfort: 3 },
  { date: "06/03", discomfort: 4 },
  { date: "07/03", discomfort: 2 },
];

export default Progress;