
import { Badge } from "@/components/ui/badge";
import { SessionExercise } from "../types/workout-plan";

interface WorkoutExerciseDetailProps {
  exerciseSession: SessionExercise;
}

export const WorkoutExerciseDetail = ({ exerciseSession }: WorkoutExerciseDetailProps) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex flex-col md:flex-row gap-4">
        {exerciseSession.exercise?.gif_url && (
          <div className="w-full md:w-48 h-48 rounded overflow-hidden bg-white flex-shrink-0">
            <img 
              src={exerciseSession.exercise.gif_url} 
              alt={exerciseSession.exercise.name}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h5 className="font-medium text-gray-900">
              {exerciseSession.exercise?.name}
            </h5>
            {exerciseSession.exercise?.muscle_group && (
              <Badge variant="outline">
                {exerciseSession.exercise.muscle_group.replace('_', ' ')}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <div className="bg-white p-2 rounded">
              <span className="text-xs text-gray-500">Séries</span>
              <p className="font-medium">{exerciseSession.sets}</p>
            </div>
            <div className="bg-white p-2 rounded">
              <span className="text-xs text-gray-500">Repetições</span>
              <p className="font-medium">{exerciseSession.reps}</p>
            </div>
            <div className="bg-white p-2 rounded">
              <span className="text-xs text-gray-500">Descanso</span>
              <p className="font-medium">{exerciseSession.rest_time_seconds}s</p>
            </div>
            {exerciseSession.intensity && (
              <div className="bg-white p-2 rounded">
                <span className="text-xs text-gray-500">Intensidade</span>
                <p className="font-medium">{exerciseSession.intensity}</p>
              </div>
            )}
          </div>
          
          {exerciseSession.exercise?.description && (
            <p className="text-sm text-gray-700 mt-2">
              {exerciseSession.exercise.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
