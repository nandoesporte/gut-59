
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import type { WorkoutHistory as WorkoutHistoryType } from "../types/workout-plan";
import { WorkoutLoadingState } from "./WorkoutLoadingState";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { generateWorkoutPDF } from "../utils/pdf-generator";
import { useRef } from "react";

interface WorkoutHistoryProps {
  isLoading: boolean;
  historyPlans?: WorkoutHistoryType[];
}

export const WorkoutHistoryView = ({ isLoading, historyPlans }: WorkoutHistoryProps) => {
  const queryClient = useQueryClient();
  const planRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleDelete = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast.success("Plano de treino excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ['workout-history'] });
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error("Erro ao excluir plano de treino");
    }
  };

  const handleDownload = async (planId: string) => {
    const planRef = planRefs.current[planId];
    if (planRef) {
      await generateWorkoutPDF(planRef);
    }
  };

  if (isLoading) {
    return <WorkoutLoadingState message="Carregando histórico de treinos..." />;
  }

  return (
    <div className="space-y-4">
      {historyPlans?.map((plan) => (
        <Collapsible key={plan.id} className="w-full">
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between">
                <div>
                  <h4 className="text-md font-medium">
                    Plano de {new Date(plan.start_date).toLocaleDateString('pt-BR')} até{" "}
                    {new Date(plan.end_date).toLocaleDateString('pt-BR')}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Objetivo: {plan.goal}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDownload(plan.id);
                    }}
                    className="h-8 w-8"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(plan.id);
                    }}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200 ease-in-out group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="p-4 md:p-6 pt-0">
                <div ref={el => planRefs.current[plan.id] = el}>
                  {plan.workout_sessions?.map((session) => (
                    <div key={session.id} className="mb-4">
                      <h5 className="font-medium">Dia {session.day_number}</h5>
                      <div className="ml-2 md:ml-4">
                        <p className="text-sm text-gray-600">{session.warmup_description}</p>
                        <ul className="list-none space-y-6 my-4">
                          {session.session_exercises?.map((exercise) => (
                            <li key={exercise.id} className="text-sm">
                              <div className="flex flex-col md:flex-row gap-4 items-start">
                                {exercise.exercises.gif_url && (
                                  <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img 
                                      src={exercise.exercises.gif_url} 
                                      alt={exercise.exercises.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                )}
                                <div className="flex-grow">
                                  <span className="font-medium text-base">{exercise.exercises.name}</span>
                                  <br className="md:hidden" />
                                  <div className="text-gray-600 mt-1">
                                    {exercise.sets} séries x {exercise.reps} repetições
                                    <br className="md:hidden" />
                                    <span className="text-gray-500 block mt-1">
                                      Descanso: {exercise.rest_time_seconds} segundos
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm text-gray-600 mt-2">{session.cooldown_description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};
