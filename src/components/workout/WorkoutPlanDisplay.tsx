
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { WorkoutPreferences } from "./types";
import { Loader2, RefreshCw, Download, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface WorkoutPlanDisplayProps {
  preferences: WorkoutPreferences;
  onReset: () => void;
}

interface WorkoutPlan {
  id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  goal: string;
  sessions: Array<{
    day_number: number;
    warmup_description: string;
    exercises: Array<{
      name: string;
      sets: number;
      reps: number;
      rest_time_seconds: number;
    }>;
    cooldown_description: string;
  }>;
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
      return data;
    },
    enabled: showHistory
  });

  const downloadPDF = async () => {
    if (!planContainerRef.current) return;

    try {
      toast.loading("Gerando PDF do seu plano de treino...");

      const canvas = await html2canvas(planContainerRef.current, {
        scale: 2, // Aumenta a qualidade
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(
        imgData, 
        'JPEG', 
        imgX, 
        imgY, 
        imgWidth * ratio, 
        imgHeight * ratio,
        undefined,
        'FAST'
      );
      
      pdf.save('plano-treino.pdf');
      toast.dismiss();
      toast.success("PDF do plano de treino baixado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.dismiss();
      toast.error("Erro ao gerar PDF do plano de treino");
    }
  };

  if (isPlanLoading) {
    return (
      <Card className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-lg font-medium text-center">Gerando seu plano de treino personalizado...</p>
        </div>
      </Card>
    );
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
            onClick={downloadPDF}
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
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Histórico de Planos</h3>
            {isHistoryLoading ? (
              <Card className="p-4 md:p-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                  <p className="text-lg font-medium text-center">Carregando histórico de treinos...</p>
                </div>
              </Card>
            ) : historyPlans?.map((plan) => (
              <Card key={plan.id} className="mb-4">
                <CardHeader className="p-4 md:p-6">
                  <h4 className="text-md font-medium">
                    Plano de {new Date(plan.start_date).toLocaleDateString('pt-BR')} até{" "}
                    {new Date(plan.end_date).toLocaleDateString('pt-BR')}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Objetivo: {plan.goal}
                  </p>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  {plan.workout_sessions?.map((session) => (
                    <div key={session.id} className="mb-4">
                      <h5 className="font-medium">Dia {session.day_number}</h5>
                      <div className="ml-2 md:ml-4">
                        <p className="text-sm text-gray-600">{session.warmup_description}</p>
                        <ul className="list-disc ml-4 space-y-2 my-2">
                          {session.session_exercises?.map((exercise) => (
                            <li key={exercise.id} className="text-sm">
                              {exercise.exercises.name} - {exercise.sets} séries x {exercise.reps} repetições
                              <br className="md:hidden" />
                              <span className="text-gray-500">
                                (descanso: {exercise.rest_time_seconds} segundos)
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm text-gray-600 mt-2">{session.cooldown_description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : currentPlan ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <h3 className="text-lg font-medium">
                  Plano de {new Date(currentPlan.start_date).toLocaleDateString('pt-BR')} até{" "}
                  {new Date(currentPlan.end_date).toLocaleDateString('pt-BR')}
                </h3>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {currentPlan.sessions.map((session) => (
                  <div key={session.day_number} className="mb-6">
                    <h4 className="font-medium mb-2">Dia {session.day_number}</h4>
                    <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                      <p className="text-sm mb-3">{session.warmup_description}</p>
                      <ul className="list-disc ml-4 space-y-2">
                        {session.exercises.map((exercise, index) => (
                          <li key={index} className="text-sm">
                            <span className="font-medium">{exercise.name}</span>
                            <br className="md:hidden" />
                            <span className="text-gray-600">
                              {" "}
                              - {exercise.sets} séries x {exercise.reps} repetições
                              <br className="md:hidden" />
                              <span className="text-gray-500">
                                (descanso: {exercise.rest_time_seconds} segundos)
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm mt-3">{session.cooldown_description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
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
