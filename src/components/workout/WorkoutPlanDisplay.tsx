
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { WorkoutPreferences } from "./types";
import { Loader2, RefreshCw } from "lucide-react";

interface WorkoutPlanDisplayProps {
  preferences: WorkoutPreferences;
  onReset: () => void;
}

export const WorkoutPlanDisplay = ({ preferences, onReset }: WorkoutPlanDisplayProps) => {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // TODO: Implement workout plan generation
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-lg font-medium">Gerando seu plano de treino personalizado...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Seu Plano de Treino Personalizado</h2>
        <Button variant="outline" onClick={onReset} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refazer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Resumo do Perfil</h3>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Peso</dt>
              <dd>{preferences.weight} kg</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Altura</dt>
              <dd>{preferences.height} cm</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Idade</dt>
              <dd>{preferences.age} anos</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Objetivo</dt>
              <dd className="capitalize">
                {preferences.goal === 'lose_weight' ? 'Perder Peso' : 
                 preferences.goal === 'maintain' ? 'Manter Peso' : 
                 'Ganhar Massa'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Plano de Treino</h3>
          <p className="text-sm text-gray-500">
            Em breve: Seu plano de treino personalizado será gerado aqui...
          </p>
        </CardHeader>
      </Card>
    </div>
  );
};
