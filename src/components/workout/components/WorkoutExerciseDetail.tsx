
import React, { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Weight } from 'lucide-react';

interface WorkoutExerciseDetailProps {
  exerciseSession: any;
  showDetails?: boolean;
}

export const WorkoutExerciseDetail = ({ exerciseSession, showDetails = true }: WorkoutExerciseDetailProps) => {
  const exercise = exerciseSession.exercise;
  const [expandDescription, setExpandDescription] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  if (!exercise) {
    console.log('Exercise data missing:', exerciseSession);
    return null;
  }
  
  return (
    <Card ref={cardRef} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Exercise placeholder - no image available */}
          <div className="w-full md:w-1/3 bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center h-48 md:h-44 relative">
            <div className="flex flex-col items-center justify-center h-full w-full bg-muted text-center px-2">
              <Dumbbell className="h-8 w-8 mb-2 text-primary/40" />
              <p className="text-sm text-muted-foreground font-medium">
                {exercise.name}
              </p>
              <span className="text-xs text-muted-foreground/70 mt-1">
                Sem imagem
              </span>
            </div>
          </div>
          
          {/* Exercise Details */}
          <div className="flex-1 p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
              <h4 className="font-semibold text-lg">{exercise.name}</h4>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {exercise.muscle_group && (
                  <Badge variant="outline" className="bg-muted/50 text-xs">
                    {exercise.muscle_group.charAt(0).toUpperCase() + exercise.muscle_group.slice(1)}
                  </Badge>
                )}
                {exercise.exercise_type && (
                  <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
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
                <div className="flex flex-wrap gap-2 md:gap-3 mb-3 text-sm">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                    {exerciseSession.sets} séries
                  </span>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                    {exerciseSession.reps} repetições
                  </span>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                    {Math.floor(exerciseSession.rest_time_seconds / 60)}:{(exerciseSession.rest_time_seconds % 60).toString().padStart(2, '0')} descanso
                  </span>
                  {(exerciseSession.recommended_weight || exerciseSession.exercise?.recommended_weight) && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md font-medium flex items-center gap-1">
                      <Weight className="h-3 w-3" />
                      {exerciseSession.recommended_weight || exerciseSession.exercise?.recommended_weight}
                    </span>
                  )}
                </div>
                
                {exercise.description && (
                  <div className="mt-2">
                    <p className={`text-sm text-muted-foreground ${!expandDescription && 'line-clamp-2'}`}>
                      {exercise.description}
                    </p>
                    {exercise.description.length > 120 && (
                      <button 
                        className="text-sm text-primary mt-1 hover:underline font-medium" 
                        onClick={() => setExpandDescription(!expandDescription)}
                      >
                        {expandDescription ? 'Mostrar menos' : 'Mostrar mais'}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
