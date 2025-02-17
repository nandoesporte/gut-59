
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutPreferences } from "./types";
import { RefreshCw, Download, History } from "lucide-react";
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
  const planContainerRef = React.useRef<HTMLDivElement>(null);
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

  const { data: historyPlans, isLoading: isHistoryLoading } = useQuery({
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

  if (isPlanLoading) {
    return <WorkoutLoadingState message="Gerando seu plano de treino personalizado..." />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'justify-between'} items-center`}>
        <h2 className="text-xl font-semibold">Seu Plano de Treino Personalizado</h2>
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
            onClick={() => generateWorkoutPDF(planContainerRef)}
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

      <div ref={planContainerRef} className="bg-white">
        {showHistory ? (
          <WorkoutHistoryView isLoading={isHistoryLoading} historyPlans={historyPlans} />
        ) : currentPlan ? (
          <CurrentWorkoutPlan plan={currentPlan} />
        ) : (
          <Card>
            <CardContent className="p-4 md:p-6">
              <p>Nenhum plano de treino gerado ainda.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
