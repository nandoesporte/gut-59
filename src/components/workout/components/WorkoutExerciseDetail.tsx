
import React from "react";
import { SessionExercise } from "../types/workout-plan";
import { Badge } from "@/components/ui/badge";

interface WorkoutExerciseDetailProps {
  exerciseSession: SessionExercise;
}

export const WorkoutExerciseDetail = ({ exerciseSession }: WorkoutExerciseDetailProps) => {
  const { exercise, sets, reps, rest_seconds, tempo, notes } = exerciseSession;
  
  // Format sets and reps for display
  const formattedSetsReps = () => {
    if (sets && reps) {
      return `${sets} séries × ${reps} repetições`;
    } else if (sets) {
      return `${sets} séries`;
    } else if (reps) {
      return `${reps} repetições`;
    }
    return "Conforme indicado";
  };
  
  // Format rest time for display
  const formattedRest = () => {
    if (!rest_seconds) return null;
    
    if (rest_seconds >= 60) {
      const minutes = Math.floor(rest_seconds / 60);
      const remainingSeconds = rest_seconds % 60;
      if (remainingSeconds === 0) {
        return `${minutes} min`;
      }
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} min`;
    }
    
    return `${rest_seconds} seg`;
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-start gap-4">
        {/* Exercise image/gif */}
        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded overflow-hidden">
          {exercise.gif_url ? (
            <img 
              src={exercise.gif_url} 
              alt={exercise.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <span className="text-gray-400 text-xs">Sem imagem</span>
            </div>
          )}
        </div>
        
        {/* Exercise details */}
        <div className="flex-1">
          <h3 className="font-medium text-lg">{exercise.name}</h3>
          
          <div className="flex flex-wrap gap-2 mt-1 mb-1">
            {exercise.muscle_group && (
              <Badge variant="outline" className="text-xs">
                {exercise.muscle_group}
              </Badge>
            )}
            {exercise.difficulty && (
              <Badge variant="outline" className="text-xs capitalize">
                {exercise.difficulty}
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <span>{formattedSetsReps()}</span>
            {formattedRest() && <span>Descanso: {formattedRest()}</span>}
            {tempo && <span>Tempo: {tempo}</span>}
          </div>

          {notes && <p className="text-sm text-gray-500 mt-1">{notes}</p>}
        </div>
      </div>
    </div>
  );
};
