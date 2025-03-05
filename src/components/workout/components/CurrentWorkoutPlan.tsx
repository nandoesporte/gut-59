
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkoutPlan } from "../types/workout-plan";
import { Calendar, Clock, Dumbbell } from "lucide-react";
import { formatInTimeZone } from 'date-fns-tz';
import { useState, useEffect } from "react";
import { formatImageUrl } from "@/utils/imageUtils";

// Timezone configuration
const BRAZIL_TIMEZONE = "America/Sao_Paulo";

interface CurrentWorkoutPlanProps {
  plan: WorkoutPlan;
}

export const CurrentWorkoutPlan = ({ plan }: CurrentWorkoutPlanProps) => {
  const [imageStatuses, setImageStatuses] = useState<Record<string, { loading: boolean, error: boolean }>>({}); 

  if (!plan || !plan.workout_sessions) {
    return null;
  }

  // Function to handle errors in loading images
  const handleImageError = (id: string, gifUrl?: string) => {
    console.error("Error loading GIF:", gifUrl);
    setImageStatuses(prev => ({
      ...prev,
      [id]: { loading: false, error: true }
    }));
  };
  
  // Function to handle successful image loads
  const handleImageLoad = (id: string) => {
    setImageStatuses(prev => ({
      ...prev,
      [id]: { loading: false, error: false }
    }));
  };

  // Initialize the image status
  const initImageStatus = (id: string) => {
    if (!imageStatuses[id]) {
      setImageStatuses(prev => ({
        ...prev,
        [id]: { loading: true, error: false }
      }));
    }
    return imageStatuses[id] || { loading: true, error: false };
  };

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
                {session.day_name || `Dia ${session.day_number}`}
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
                {session.session_exercises?.map((exerciseSession) => {
                  const exerciseId = exerciseSession.id || `${session.day_number}-${exerciseSession.exercise?.id || 'unknown'}`;
                  const imageStatus = initImageStatus(exerciseId);
                  
                  // Use the formatImageUrl utility function to get proper URL
                  const gifUrl = exerciseSession.exercise?.gif_url 
                    ? formatImageUrl(exerciseSession.exercise.gif_url)
                    : "/placeholder.svg";
                  
                  // Log for diagnostic
                  console.log(`Exercício: ${exerciseSession.exercise?.name}, GIF URL original: ${exerciseSession.exercise?.gif_url}, formatada: ${gifUrl}`);
                  
                  return (
                    <div 
                      key={exerciseId}
                      className="bg-gray-50 rounded-lg p-6 transition-all hover:shadow-md"
                    >
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-64 h-64 rounded-lg overflow-hidden bg-white shadow-inner flex items-center justify-center">
                          {imageStatus.error ? (
                            <div className="text-gray-400 text-xs text-center p-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Imagem do exercício não disponível
                            </div>
                          ) : (
                            <img 
                              src={gifUrl}
                              alt={exerciseSession.exercise?.name || "Exercício"}
                              className="w-full h-full object-contain"
                              loading="lazy"
                              onError={() => handleImageError(exerciseId, exerciseSession.exercise?.gif_url)}
                              onLoad={() => handleImageLoad(exerciseId)}
                            />
                          )}
                        </div>
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
                  );
                })}
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
