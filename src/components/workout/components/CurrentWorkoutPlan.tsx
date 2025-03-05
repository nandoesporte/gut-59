
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkoutPlan } from "../types/workout-plan";
import { Calendar, Clock, Dumbbell } from "lucide-react";
import { formatInTimeZone } from 'date-fns-tz';

// Timezone configuration
const BRAZIL_TIMEZONE = "America/Sao_Paulo";

interface CurrentWorkoutPlanProps {
  plan: WorkoutPlan;
}

export const CurrentWorkoutPlan = ({ plan }: CurrentWorkoutPlanProps) => {
  if (!plan || !plan.workout_sessions) {
    return null;
  }

  // Group exercises by muscle group for better visualization
  const getMuscleGroupBadges = (session: any) => {
    if (!session.session_exercises) return null;
    
    // Extract unique muscle groups from this session
    const muscleGroups = new Set<string>();
    session.session_exercises.forEach((ex: any) => {
      if (ex.exercise?.muscle_group) {
        muscleGroups.add(ex.exercise.muscle_group);
      }
    });
    
    // Convert to array and sort
    return Array.from(muscleGroups).sort().map(group => (
      <Badge key={group} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 mr-1">
        {group.replace('_', ' ')}
      </Badge>
    ));
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
                  {formatInTimeZone(new Date(plan.start_date), BRAZIL_TIMEZONE, 'dd/MM/yyyy')} até{" "}
                  {formatInTimeZone(new Date(plan.end_date), BRAZIL_TIMEZONE, 'dd/MM/yyyy')}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary-50 text-primary-600">
              {plan.goal}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {plan.workout_sessions.map((session) => (
        <Card key={session.id} className="overflow-hidden bg-white shadow-lg transition-all hover:shadow-xl">
          <CardHeader className="p-6 bg-gradient-to-r from-primary-500 to-primary-600">
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-semibold text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5" />
                Dia {session.day_number}
              </h4>
              <div className="flex flex-wrap gap-1">
                {getMuscleGroupBadges(session)}
              </div>
            </div>
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
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-grow">
                        <div className="flex justify-between items-start mb-4">
                          <h6 className="text-lg font-medium text-gray-900">
                            {exerciseSession.exercise?.name}
                          </h6>
                          {exerciseSession.exercise?.muscle_group && (
                            <Badge className="bg-primary-100 text-primary-700 border-none">
                              {exerciseSession.exercise.muscle_group.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
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
