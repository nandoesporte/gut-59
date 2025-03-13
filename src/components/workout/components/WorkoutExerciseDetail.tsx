
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatImageUrl } from '@/utils/imageUtils';
import { Skeleton } from "@/components/ui/skeleton";

interface WorkoutExerciseDetailProps {
  exerciseSession: any;
  showDetails?: boolean;
}

export const WorkoutExerciseDetail = ({ exerciseSession, showDetails = true }: WorkoutExerciseDetailProps) => {
  const exercise = exerciseSession.exercise;
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  
  if (!exercise) return null;
  
  return (
    <Card className="overflow-hidden border-none shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Exercise GIF/Image */}
          <div className="w-full md:w-1/4 bg-gray-100 overflow-hidden flex items-center justify-center h-36">
            {!imageLoaded && !imageError && (
              <Skeleton className="h-36 w-full" />
            )}
            
            {imageError && (
              <div className="flex items-center justify-center h-full w-full bg-muted">
                <p className="text-xs text-muted-foreground text-center px-2">
                  Imagem não disponível
                </p>
              </div>
            )}
            
            <img 
              src={formatImageUrl(exercise.gif_url)} 
              alt={exercise.name}
              className={`h-36 object-cover ${imageLoaded && !imageError ? 'block' : 'hidden'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(true);
              }}
            />
          </div>
          
          {/* Exercise Details */}
          <div className="flex-1 p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
              <h4 className="font-medium text-md">{exercise.name}</h4>
              <div className="flex flex-wrap gap-2">
                {exercise.muscle_group && (
                  <Badge variant="outline" className="bg-muted/50">
                    {exercise.muscle_group.charAt(0).toUpperCase() + exercise.muscle_group.slice(1)}
                  </Badge>
                )}
                {exercise.exercise_type && (
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {exercise.exercise_type === 'strength' ? 'Força' : 
                     exercise.exercise_type === 'cardio' ? 'Cardio' : 
                     exercise.exercise_type === 'mobility' ? 'Mobilidade' : 
                     exercise.exercise_type}
                  </Badge>
                )}
              </div>
            </div>
            
            {showDetails && (
              <>
                <div className="flex flex-wrap gap-3 my-2 text-sm">
                  <span className="bg-muted px-2 py-1 rounded-md">
                    {exerciseSession.sets} séries
                  </span>
                  <span className="bg-muted px-2 py-1 rounded-md">
                    {exerciseSession.reps} repetições
                  </span>
                  <span className="bg-muted px-2 py-1 rounded-md">
                    {Math.floor(exerciseSession.rest_time_seconds / 60)}:{(exerciseSession.rest_time_seconds % 60).toString().padStart(2, '0')} descanso
                  </span>
                </div>
                
                {exercise.description && (
                  <p className="text-sm text-muted-foreground mt-2">{exercise.description}</p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
