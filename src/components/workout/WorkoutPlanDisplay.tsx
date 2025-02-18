
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutPreferences } from "./types";
import { RefreshCw, Download, History, Target, Calendar, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { WorkoutLoadingState } from "./components/WorkoutLoadingState";
import { WorkoutHistoryView } from "./components/WorkoutHistory";
import { CurrentWorkoutPlan } from "./components/CurrentWorkoutPlan";
import { generateWorkoutPDF } from "./utils/pdf-generator";
import { WorkoutPlan, WorkoutHistory } from "./types/workout-plan";

interface WorkoutPlanDisplayProps {
  preferences: WorkoutPreferences;
  onReset: () => void;
}

export const WorkoutPlanDisplay = ({ preferences, onReset }: WorkoutPlanDisplayProps) => {
  const [showHistory, setShowHistory] = React.useState(false);
  const isMobile = useIsMobile();

  const { data: currentPlan, isLoading: isPlanLoading } = useQuery({
    queryKey: ['workout-plan', preferences],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const response = await supabase.functions.invoke('generate-workout-plan', {
        body: { preferences, userId: userData.user.id }
      });

      if (response.error) throw response.error;
      return response.data as WorkoutPlan;
    }
  });

  const { data: historyPlans, isLoading: isHistoryLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['workout-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select(`
          *,
          workout_sessions (
            *,
            session_exercises (
              *,
              exercises (*)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkoutHistory[];
    },
    enabled: showHistory
  });

  const handleGeneratePDF = () => {
    if (currentPlan) {
      generateWorkoutPDF(currentPlan as WorkoutHistory);
    }
  };

  if (isPlanLoading) {
    return <WorkoutLoadingState message="Gerando seu plano de treino personalizado..." />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="bg-white">
        <CardContent className="p-6">
          <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'justify-between'} items-center`}>
            <div className="flex items-center gap-2">
              <Target className="w-6 h-6 text-primary-500" />
              <h2 className="text-xl font-semibold">Seu Plano de Treino Personalizado</h2>
            </div>
            <div className={`flex ${isMobile ? 'w-full' : ''} gap-2 flex-wrap justify-end`}>
              <Button 
                variant="outline" 
                onClick={() => setShowHistory(!showHistory)}
                className={isMobile ? 'flex-1' : ''}
              >
                <History className="w-4 h-4 mr-2" />
                {showHistory ? "Ocultar Histórico" : "Ver Histórico"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleGeneratePDF}
                className={isMobile ? 'flex-1' : ''}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={onReset}
                className={isMobile ? 'flex-1' : ''}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refazer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-white">
        {showHistory ? (
          <WorkoutHistoryView 
            isLoading={isHistoryLoading} 
            historyPlans={historyPlans} 
            onRefresh={() => refetchHistory()} 
          />
        ) : currentPlan ? (
          <CurrentWorkoutPlan plan={currentPlan} />
        ) : (
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 text-gray-500">
                <Activity className="w-5 h-5" />
                <p>Nenhum plano de treino gerado ainda.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
