
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { WorkoutHistory } from "../types/workout-plan";
import { WorkoutLoadingState } from "./WorkoutLoadingState";

interface WorkoutHistoryProps {
  isLoading: boolean;
  historyPlans?: WorkoutHistory[];
}

export const WorkoutHistory = ({ isLoading, historyPlans }: WorkoutHistoryProps) => {
  if (isLoading) {
    return <WorkoutLoadingState message="Carregando histórico de treinos..." />;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Histórico de Planos</h3>
      {historyPlans?.map((plan) => (
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
  );
};
