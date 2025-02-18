
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkoutPlan } from "../types/workout-plan";
import { Calendar, Clock, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";

interface CurrentWorkoutPlanProps {
  plan: WorkoutPlan;
}

export const CurrentWorkoutPlan = ({ plan }: CurrentWorkoutPlanProps) => {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const fetchExerciseGif = async (exerciseName: string) => {
    try {
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=P5EDHjFx7h4TfqB4JsGX8JBvGa4V3p1K&q=${encodeURIComponent(exerciseName + " exercise")}&limit=1&rating=g`);
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data[0].images.fixed_height.url;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar GIF:', error);
      return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-lg">
        <CardHeader className="p-6 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold">
                Plano de Treino Personalizado
              </h3>
              <div className="flex items-center gap-2 mt-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  {new Date(plan.start_date).toLocaleDateString('pt-BR')} até{" "}
                  {new Date(plan.end_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary-50 text-primary-600">
              {plan.goal}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {plan.sessions.map((session) => (
        <Card key={session.day_number} className="overflow-hidden bg-white shadow-lg transition-all hover:shadow-xl">
          <CardHeader className="p-6 bg-gradient-to-r from-primary-500 to-primary-600">
            <h4 className="text-xl font-semibold text-white flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Dia {session.day_number}
            </h4>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="bg-primary-50 p-4 rounded-lg">
                <h5 className="font-medium text-primary-700 mb-2">Aquecimento</h5>
                <p className="text-sm text-gray-600">{session.warmup_description}</p>
              </div>

              <div className="space-y-8">
                {session.exercises.map((exercise, index) => (
                  <div 
                    key={index}
                    className="bg-gray-50 rounded-lg p-6 transition-all hover:shadow-md"
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      {exercise.gifUrl && (
                        <div className="w-full md:w-64 h-64 rounded-lg overflow-hidden bg-white shadow-inner">
                          <img 
                            src={exercise.gifUrl} 
                            alt={exercise.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-grow">
                        <h6 className="text-lg font-medium text-gray-900 mb-4">
                          {exercise.name}
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <span className="text-sm text-gray-500 block mb-1">Séries</span>
                            <span className="text-lg font-semibold text-primary-600">
                              {exercise.sets}
                            </span>
                          </div>
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <span className="text-sm text-gray-500 block mb-1">Repetições</span>
                            <span className="text-lg font-semibold text-primary-600">
                              {exercise.reps}
                            </span>
                          </div>
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <span className="text-sm text-gray-500 block mb-1">
                              <Clock className="w-4 h-4 inline-block mr-1" />
                              Descanso
                            </span>
                            <span className="text-lg font-semibold text-primary-600">
                              {exercise.rest_time_seconds}s
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-primary-50 p-4 rounded-lg mt-6">
                <h5 className="font-medium text-primary-700 mb-2">Volta à calma</h5>
                <p className="text-sm text-gray-600">{session.cooldown_description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
