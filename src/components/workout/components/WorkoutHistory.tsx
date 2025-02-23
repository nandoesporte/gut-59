
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { History, ChevronDown, Calendar, Target, Activity, Download, Trash2, Loader2 } from "lucide-react";
import type { WorkoutPlan } from "../types/workout-plan";
import { generateWorkoutPDF } from "../utils/pdf-generator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface WorkoutHistoryViewProps {
  isLoading: boolean;
  historyPlans?: WorkoutPlan[];
  onRefresh?: () => void;
}

export const WorkoutHistoryView = ({ isLoading, historyPlans, onRefresh }: WorkoutHistoryViewProps) => {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [generatingPDF, setGeneratingPDF] = useState<Set<string>>(new Set());

  const handleDelete = async (planId: string) => {
    try {
      setDeletingIds(prev => new Set([...prev, planId]));

      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      toast.success("Plano excluído com sucesso");
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error("Erro ao excluir plano");
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(planId);
        return newSet;
      });
    }
  };

  const handleDownload = async (plan: WorkoutPlan) => {
    try {
      setGeneratingPDF(prev => new Set([...prev, plan.id]));
      await generateWorkoutPDF(plan);
      toast.success("PDF gerado com sucesso");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPDF(prev => {
        const newSet = new Set(prev);
        newSet.delete(plan.id);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!historyPlans || historyPlans.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <History className="w-5 h-5" />
          <p>Nenhum histórico de treino encontrado.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
        <History className="w-6 h-6 text-primary" />
        Histórico de Treinos
      </h2>
      
      {historyPlans.map((plan) => (
        <Collapsible key={plan.id}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-start gap-4">
                  <Target className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium text-left">
                      Plano de Treino - {new Date(plan.start_date).toLocaleDateString()}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Validade: {new Date(plan.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(plan);
                    }}
                    disabled={generatingPDF.has(plan.id)}
                  >
                    {generatingPDF.has(plan.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(plan.id);
                    }}
                    disabled={deletingIds.has(plan.id)}
                  >
                    {deletingIds.has(plan.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-destructive" />
                    )}
                  </Button>
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="p-4 pt-0">
                {plan.workout_sessions.map((session) => (
                  <div key={session.id} className="border-t pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-5 h-5 text-primary" />
                      <h4 className="font-medium">Dia {session.day_number}</h4>
                    </div>
                    <div className="ml-2 md:ml-4">
                      <p className="text-sm text-gray-600">{session.warmup_description}</p>
                      <ul className="list-none space-y-6 my-4">
                        {session.session_exercises.map((exerciseSession, idx) => (
                          <li key={`${session.id}-${idx}`} className="text-sm">
                            <div className="flex flex-col md:flex-row gap-4 items-start">
                              {exerciseSession.exercise.gif_url && (
                                <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                  <img 
                                    src={exerciseSession.exercise.gif_url} 
                                    alt={exerciseSession.exercise.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <div className="flex-grow">
                                <span className="font-medium text-base">{exerciseSession.exercise.name}</span>
                                <div className="text-gray-600 mt-1">
                                  {exerciseSession.sets} séries x {exerciseSession.reps} repetições
                                  <span className="text-gray-500 block mt-1">
                                    Descanso: {exerciseSession.rest_time_seconds} segundos
                                  </span>
                                </div>
                                {exerciseSession.exercise.description && (
                                  <p className="text-sm text-gray-500 mt-2">{exerciseSession.exercise.description}</p>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm text-gray-600 mt-2">{session.cooldown_description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};
