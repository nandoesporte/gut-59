
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { WorkoutPlan } from '../types/workout-plan';
import { Calendar, Clock, Dumbbell, Download, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { generateWorkoutPDF } from '../utils/pdf-generator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatInTimeZone } from 'date-fns-tz';
import { Button } from '@/components/ui/button';

// Timezone configuration
const BRAZIL_TIMEZONE = "America/Sao_Paulo";

interface WorkoutHistoryProps {
  plans: WorkoutPlan[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({ 
  plans, 
  isLoading = false,
  onRefresh 
}) => {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = async (planId: string) => {
    try {
      setDeletingIds(prev => new Set([...prev, planId]));
      
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      toast.success('Plano de treino excluído com sucesso');
      
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error('Erro ao excluir o plano de treino');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(planId);
        return newSet;
      });
    }
  };

  const getGoalText = (goal: string) => {
    switch (goal) {
      case 'lose_weight':
        return 'Emagrecimento';
      case 'gain_mass':
        return 'Ganho de Massa';
      case 'maintain':
        return 'Manutenção';
      default:
        return 'Manutenção';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Histórico de Treinos</h2>
          {onRefresh && (
            <Button variant="ghost" size="sm" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Carregando...
            </Button>
          )}
        </div>
        <Card className="p-8 flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando histórico de treinos...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Histórico de Treinos</h2>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          )}
        </div>
        <Card className="p-8">
          <div className="text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-600 mb-1">Nenhum plano encontrado</h3>
            <p className="text-muted-foreground">
              Crie seu primeiro plano de treino personalizado.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Histórico de Treinos</h2>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        )}
      </div>
      
      {plans.map((plan) => (
        <Accordion type="single" collapsible key={plan.id}>
          <AccordionItem value={plan.id}>
            <Card className="bg-white shadow-lg">
              <CardHeader className="p-6 border-b">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      Plano de {getGoalText(plan.goal)}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        {formatInTimeZone(new Date(plan.start_date), BRAZIL_TIMEZONE, 'dd/MM/yyyy')} até{" "}
                        {formatInTimeZone(new Date(plan.end_date), BRAZIL_TIMEZONE, 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary-50 text-primary-600">
                      {getGoalText(plan.goal)}
                    </Badge>
                    <button
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateWorkoutPDF(plan);
                      }}
                    >
                      <Download className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                      className="p-2 hover:bg-red-50 rounded-full transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(plan.id);
                      }}
                      disabled={deletingIds.has(plan.id)}
                    >
                      {deletingIds.has(plan.id) ? (
                        <Loader2 className="h-5 w-5 text-red-400 animate-spin" />
                      ) : (
                        <Trash2 className="h-5 w-5 text-red-600" />
                      )}
                    </button>
                  </div>
                </div>
              </CardHeader>

              <AccordionTrigger className="w-full hover:no-underline px-6 py-2">
                <span className="text-sm text-primary-600">Ver detalhes do treino</span>
              </AccordionTrigger>

              <AccordionContent>
                <CardContent className="p-6">
                  {plan.workout_sessions?.map((session) => (
                    <Card key={session.id} className="overflow-hidden bg-white shadow-lg transition-all hover:shadow-xl mb-6 last:mb-0">
                      <CardHeader className="p-6 bg-gradient-to-r from-primary-500 to-primary-600">
                        <h4 className="text-xl font-semibold text-white flex items-center gap-2">
                          <Dumbbell className="w-5 h-5" />
                          {session.day_name || `Dia ${session.day_number}`}
                          {session.focus && <span className="text-sm opacity-80">({session.focus})</span>}
                        </h4>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-6">
                          <div className="bg-primary-50 p-4 rounded-lg">
                            <h5 className="font-medium text-primary-700 mb-2">Aquecimento</h5>
                            <p className="text-sm text-gray-600">{session.warmup_description}</p>
                          </div>

                          <div className="space-y-8">
                            {session.session_exercises?.map((exerciseSession) => (
                              <div 
                                key={exerciseSession.id}
                                className="bg-gray-50 rounded-lg p-6 transition-all hover:shadow-md"
                              >
                                <div className="flex flex-col md:flex-row gap-6">
                                  {exerciseSession.exercise?.gif_url && (
                                    <div className="w-full md:w-64 h-64 rounded-lg overflow-hidden bg-white shadow-inner">
                                      <img 
                                        src={exerciseSession.exercise.gif_url} 
                                        alt={exerciseSession.exercise.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-grow">
                                    <h6 className="text-lg font-medium text-gray-900 mb-4">
                                      {exerciseSession.exercise?.name}
                                    </h6>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <span className="text-sm text-gray-500 block mb-1">Séries</span>
                                        <span className="text-lg font-semibold text-primary-600">
                                          {exerciseSession.sets}
                                        </span>
                                      </div>
                                      <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <span className="text-sm text-gray-500 block mb-1">Repetições</span>
                                        <span className="text-lg font-semibold text-primary-600">
                                          {exerciseSession.reps}
                                        </span>
                                      </div>
                                      <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <span className="text-sm text-gray-500 block mb-1">
                                          <Clock className="w-4 h-4 inline-block mr-1" />
                                          Descanso
                                        </span>
                                        <span className="text-lg font-semibold text-primary-600">
                                          {exerciseSession.rest_time_seconds}s
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {exerciseSession.exercise?.description && (
                                      <p className="text-sm text-gray-500 mt-4">
                                        {exerciseSession.exercise.description}
                                      </p>
                                    )}

                                    {exerciseSession.intensity && (
                                      <div className="mt-3 bg-blue-50 p-2 rounded text-sm text-blue-700">
                                        Intensidade: {exerciseSession.intensity}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="bg-primary-50 p-4 rounded-lg mt-6">
                            <h5 className="font-medium text-primary-700 mb-2">Volta à calma</h5>
                            <p className="text-sm text-gray-600">{session.cooldown_description}</p>
                          </div>

                          {session.training_load && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h5 className="font-medium text-blue-700 mb-2">Carga de Treino</h5>
                              <ul className="space-y-1 ml-4 list-disc text-sm text-gray-700">
                                {session.training_load.intensity && <li>Intensidade: {session.training_load.intensity}</li>}
                                {session.training_load.volume && <li>Volume: {session.training_load.volume}</li>}
                                {session.training_load.progression && <li>Progressão: {session.training_load.progression}</li>}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {plan.critique && (
                    <Card className="bg-white shadow-md">
                      <CardHeader className="bg-gray-50 border-b">
                        <h4 className="text-lg font-medium">Análise do Plano</h4>
                      </CardHeader>
                      <CardContent className="p-6">
                        {plan.critique.strengths && plan.critique.strengths.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-medium text-green-700 mb-2">Pontos Fortes</h5>
                            <ul className="list-disc ml-5 space-y-1">
                              {plan.critique.strengths.map((strength, idx) => (
                                <li key={idx} className="text-sm text-gray-700">{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {plan.critique.suggestions && plan.critique.suggestions.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-medium text-amber-700 mb-2">Sugestões</h5>
                            <ul className="list-disc ml-5 space-y-1">
                              {plan.critique.suggestions.map((suggestion, idx) => (
                                <li key={idx} className="text-sm text-gray-700">{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {plan.critique.notes && (
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">Observações</h5>
                            <p className="text-sm text-gray-600">{plan.critique.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
};

export default WorkoutHistory;
