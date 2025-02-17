
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { WorkoutPlan } from "../types/workout-plan";

interface CurrentWorkoutPlanProps {
  plan: WorkoutPlan;
}

export const CurrentWorkoutPlan = ({ plan }: CurrentWorkoutPlanProps) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 md:p-6">
          <h3 className="text-lg font-medium">
            Plano de {new Date(plan.start_date).toLocaleDateString('pt-BR')} até{" "}
            {new Date(plan.end_date).toLocaleDateString('pt-BR')}
          </h3>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {plan.sessions.map((session) => (
            <div key={session.day_number} className="mb-6">
              <h4 className="font-medium mb-2">Dia {session.day_number}</h4>
              <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                <p className="text-sm mb-3">{session.warmup_description}</p>
                <ul className="list-none space-y-6">
                  {session.exercises.map((exercise, index) => (
                    <li key={index} className="text-sm">
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
                <p className="text-sm mt-3">{session.cooldown_description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
