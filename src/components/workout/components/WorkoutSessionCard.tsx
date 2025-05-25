
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WorkoutSession } from "../types/workout-plan";
import { WorkoutExerciseDetail } from "./WorkoutExerciseDetail";
import { 
  Thermometer, 
  Play, 
  Square,
  Target,
  Clock
} from "lucide-react";

interface WorkoutSessionCardProps {
  session: WorkoutSession;
}

export const WorkoutSessionCard = ({ session }: WorkoutSessionCardProps) => {
  // Get unique exercises by exercise ID to avoid duplicates
  const getUniqueExercises = () => {
    if (!session.session_exercises) return [];
    
    const seen = new Set();
    return session.session_exercises.filter(ex => {
      if (!ex.exercise?.id) return false;
      if (seen.has(ex.exercise.id)) return false;
      seen.add(ex.exercise.id);
      return true;
    });
  };

  const uniqueExercises = getUniqueExercises();

  // Group exercises by muscle group
  const exercisesByMuscleGroup = uniqueExercises.reduce((groups, ex) => {
    const muscleGroup = ex.exercise?.muscle_group || 'outros';
    if (!groups[muscleGroup]) {
      groups[muscleGroup] = [];
    }
    groups[muscleGroup].push(ex);
    return groups;
  }, {} as Record<string, typeof uniqueExercises>);

  const muscleGroups = Object.keys(exercisesByMuscleGroup).sort();

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                Dia {session.day_number}
                {session.day_name && ` - ${session.day_name}`}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {session.focus && (
                  <Badge variant="outline" className="text-xs">
                    <Target className="w-3 h-3 mr-1" />
                    {session.focus}
                  </Badge>
                )}
                {session.intensity && (
                  <Badge variant="secondary" className="text-xs">
                    <Thermometer className="w-3 h-3 mr-1" />
                    {session.intensity}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {uniqueExercises.length} exercícios
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Warmup */}
      {session.warmup_description && (
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 dark:bg-blue-950 p-2 rounded-full">
                <Play className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-1">
                  Aquecimento
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {session.warmup_description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercises by Muscle Group */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Exercícios ({uniqueExercises.length})
        </h3>
        
        {muscleGroups.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Nenhum exercício encontrado para esta sessão.
              </p>
            </CardContent>
          </Card>
        ) : (
          muscleGroups.map((muscleGroup, groupIndex) => (
            <div key={`${session.id}-${muscleGroup}`} className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-medium text-primary capitalize">
                  {muscleGroup}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {exercisesByMuscleGroup[muscleGroup].length} exercício{exercisesByMuscleGroup[muscleGroup].length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                {exercisesByMuscleGroup[muscleGroup].map((exerciseSession, index) => (
                  <WorkoutExerciseDetail 
                    key={`${session.id}-${muscleGroup}-${exerciseSession.exercise?.id || index}`}
                    exerciseSession={exerciseSession}
                    showDetails={true}
                  />
                ))}
              </div>
              
              {groupIndex < muscleGroups.length - 1 && (
                <Separator className="my-6" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Cooldown */}
      {session.cooldown_description && (
        <Card className="border-l-4 border-l-green-400">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 dark:bg-green-950 p-2 rounded-full">
                <Square className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-green-800 dark:text-green-400 mb-1">
                  Volta à Calma
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {session.cooldown_description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Load Info */}
      {session.training_load && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Informações de Carga</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {session.training_load.intensity && (
                <div>
                  <span className="text-muted-foreground">Intensidade:</span>
                  <span className="ml-1 font-medium">{session.training_load.intensity}</span>
                </div>
              )}
              {session.training_load.volume && (
                <div>
                  <span className="text-muted-foreground">Volume:</span>
                  <span className="ml-1 font-medium">{session.training_load.volume}</span>
                </div>
              )}
              {session.training_load.progression && (
                <div>
                  <span className="text-muted-foreground">Progressão:</span>
                  <span className="ml-1 font-medium">{session.training_load.progression}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
