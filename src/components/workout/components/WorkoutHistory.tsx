import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { History, ChevronDown, Calendar, Target, Activity } from "lucide-react";
import type { WorkoutHistory } from "../types/workout-plan";

interface WorkoutHistoryViewProps {
  isLoading: boolean;
  historyPlans?: WorkoutHistory[];
}

export const WorkoutHistoryView = ({ isLoading, historyPlans }: WorkoutHistoryViewProps) => {
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
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
      <div className="flex items-center gap-2 mb-4">
        <History className="w-6 h-6 text-primary-500" />
        <h2 className="text-xl font-semibold">Histórico de Treinos</h2>
      </div>
      
      {historyPlans.map((plan) => (
        <Collapsible key={plan.id}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-start gap-4">
                  <Target className="w-5 h-5 text-primary-500 mt-1" />
                  <div>
                    <h3 className="font-medium">
                      Plano de {new Date(plan.created_at).toLocaleDateString()}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(plan.start_date).toLocaleDateString()} até{' '}
                        {new Date(plan.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="p-4 pt-0">
                {plan.workout_sessions.map((session) => (
                  <div key={session.id} className="border-t pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-5 h-5 text-primary-500" />
                      <h4 className="font-medium">Dia {session.day_number}</h4>
                    </div>
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
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};
