
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WorkoutProgressChartProps {
  progressData: any[];
}

export const WorkoutProgressChart = ({ progressData }: WorkoutProgressChartProps) => {
  if (progressData.length === 0) return null;

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Seu Progresso</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="difficulty"
              stroke="#2563eb"
              name="Nível de Dificuldade"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
