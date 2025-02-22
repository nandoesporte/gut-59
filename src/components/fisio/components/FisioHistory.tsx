
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { History, ChevronDown, Calendar, Loader2, Download, Trash2 } from "lucide-react";
import type { RehabPlan } from "../types/rehab-plan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface FisioHistoryViewProps {
  isLoading: boolean;
  historyPlans?: RehabPlan[];
  onRefresh?: () => void;
}

export const FisioHistoryView = ({ isLoading, historyPlans = [], onRefresh }: FisioHistoryViewProps) => {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = async (planId: string) => {
    try {
      setDeletingIds(prev => new Set([...prev, planId]));

      const { error } = await supabase
        .from('rehab_plans')
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
          <p>Nenhum histórico de reabilitação encontrado.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
        <History className="w-6 h-6 text-primary" />
        Histórico de Reabilitação
      </h2>
      
      {historyPlans.map((plan) => (
        <Collapsible key={plan.id}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-start gap-4">
                  <div>
                    <h3 className="font-medium text-left">
                      Plano de Reabilitação - {new Date(plan.start_date).toLocaleDateString()}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Até: {new Date(plan.end_date).toLocaleDateString()}
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
                {plan.rehab_sessions.map((session) => (
                  <div key={session.day_number} className="border-t pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-medium">Dia {session.day_number}</h4>
                    </div>
                    <div className="ml-2 md:ml-4">
                      <p className="text-sm text-gray-600">{session.warmup_description}</p>
                      <ul className="list-none space-y-6 my-4">
                        {session.exercises.map((exercise, idx) => (
                          <li key={`${session.day_number}-${idx}`} className="text-sm">
                            <div className="flex flex-col md:flex-row gap-4 items-start">
                              {exercise.gifUrl && (
                                <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                  <img 
                                    src={exercise.gifUrl} 
                                    alt={exercise.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <div className="flex-grow">
                                <span className="font-medium text-base">{exercise.name}</span>
                                <div className="text-gray-600 mt-1">
                                  {exercise.sets} séries x {exercise.reps} repetições
                                  <span className="text-gray-500 block mt-1">
                                    Descanso: {exercise.rest_time_seconds} segundos
                                  </span>
                                </div>
                                {exercise.notes && (
                                  <p className="text-sm text-gray-500 mt-2">{exercise.notes}</p>
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
