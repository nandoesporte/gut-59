
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { History, ChevronDown, Calendar, Loader2, Download, Trash2 } from "lucide-react";
import type { RehabPlan } from "../types/rehab-plan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { formatImageUrl } from "@/utils/imageUtils";

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
      console.error('Erro ao excluir plano:', error);
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
                      Plano de Reabilitação - {plan.joint_area ? plan.joint_area.charAt(0).toUpperCase() + plan.joint_area.slice(1) : 'Área não especificada'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(plan.start_date).toLocaleDateString()} até {new Date(plan.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    {plan.condition && (
                      <div className="text-xs text-gray-500 mt-1">
                        Condição: {plan.condition}
                      </div>
                    )}
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
                {plan.overview && (
                  <div className="mb-4 p-3 bg-muted/30 rounded-md">
                    <h4 className="font-medium mb-1">Visão Geral</h4>
                    <p className="text-sm">{plan.overview}</p>
                  </div>
                )}
                
                {/* Display days if available */}
                {plan.days && Object.keys(plan.days).length > 0 ? (
                  Object.entries(plan.days).map(([dayKey, dayData]) => (
                    <div key={dayKey} className="border-t pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="font-medium">Dia {dayKey.replace('day', '')}</h4>
                      </div>
                      <div className="ml-2 md:ml-4">
                        {dayData.notes && <p className="text-sm text-gray-600 mb-3">{dayData.notes}</p>}
                        
                        {dayData.exercises && dayData.exercises.map((group, groupIdx) => (
                          <div key={groupIdx} className="mb-4">
                            <h5 className="text-sm font-medium mb-2">{group.title || 'Exercícios'}</h5>
                            <ul className="list-none space-y-4">
                              {group.exercises && group.exercises.map((exercise, exIdx) => (
                                <li key={exIdx} className="text-sm bg-muted/20 p-3 rounded-md">
                                  <div className="flex flex-col md:flex-row gap-4 items-start">
                                    {exercise.gifUrl && (
                                      <div className="w-full md:w-40 h-40 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                        <img 
                                          src={formatImageUrl(exercise.gifUrl)} 
                                          alt={exercise.name}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                                          }}
                                        />
                                      </div>
                                    )}
                                    <div className="flex-grow">
                                      <span className="font-medium text-base">{exercise.name}</span>
                                      <div className="text-gray-600 mt-1">
                                        {exercise.sets} séries x {exercise.reps} repetições
                                        <span className="text-gray-500 block mt-1">
                                          Descanso: {exercise.restTime || '60 segundos'}
                                        </span>
                                      </div>
                                      {exercise.description && (
                                        <p className="text-sm text-gray-500 mt-2">{exercise.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  // Display rehab_sessions if no days structure but we have rehab_sessions
                  plan.rehab_sessions && plan.rehab_sessions.length > 0 ? (
                    plan.rehab_sessions.map((session, index) => (
                      <div key={index} className="border-t pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="font-medium">Dia {session.day_number || index + 1}</h4>
                        </div>
                        <div className="ml-2 md:ml-4">
                          {session.warmup_description && <p className="text-sm text-gray-600 mb-3">{session.warmup_description}</p>}
                          
                          <ul className="list-none space-y-4">
                            {session.exercises && session.exercises.map((exercise, exIdx) => (
                              <li key={exIdx} className="text-sm bg-muted/20 p-3 rounded-md">
                                <div className="flex flex-col md:flex-row gap-4 items-start">
                                  {exercise.gifUrl && (
                                    <div className="w-full md:w-40 h-40 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                      <img 
                                        src={formatImageUrl(exercise.gifUrl)} 
                                        alt={exercise.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                                        }}
                                      />
                                    </div>
                                  )}
                                  <div className="flex-grow">
                                    <span className="font-medium text-base">{exercise.name}</span>
                                    <div className="text-gray-600 mt-1">
                                      {exercise.sets} séries x {exercise.reps} repetições
                                      <span className="text-gray-500 block mt-1">
                                        Descanso: {exercise.rest_time_seconds ? `${exercise.rest_time_seconds} segundos` : '60 segundos'}
                                      </span>
                                    </div>
                                    {exercise.description && (
                                      <p className="text-sm text-gray-500 mt-2">{exercise.description}</p>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                          
                          {session.cooldown_description && <p className="text-sm text-gray-600 mt-3">{session.cooldown_description}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center bg-gray-50 dark:bg-gray-800 rounded-md">
                      <p className="text-muted-foreground">Detalhes do plano não disponíveis.</p>
                    </div>
                  )
                )}
                
                {plan.recommendations && plan.recommendations.length > 0 && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-md">
                    <h4 className="font-medium mb-1">Recomendações</h4>
                    {Array.isArray(plan.recommendations) ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {plan.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm">{rec}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm">{plan.recommendations}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};
