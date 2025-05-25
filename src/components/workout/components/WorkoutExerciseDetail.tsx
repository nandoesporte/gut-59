
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Weight, Maximize } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { OptimizedGifImage } from './OptimizedGifImage';

interface WorkoutExerciseDetailProps {
  exerciseSession: any;
  showDetails?: boolean;
}

export const WorkoutExerciseDetail = ({ exerciseSession, showDetails = true }: WorkoutExerciseDetailProps) => {
  const exercise = exerciseSession.exercise;
  const [expandDescription, setExpandDescription] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  if (!exercise) {
    console.log('❌ Exercise data missing:', exerciseSession);
    return null;
  }

  // Intersection Observer para lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '100px',
        threshold: 0.1 
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  console.log(`🏋️ Loading exercise: ${exercise.name} (${exercise.id})`);
  console.log(`🔗 GIF URL from DB:`, exercise.gif_url);
  
  return (
    <Card ref={cardRef} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Exercise GIF/Image */}
          <div className="w-full md:w-1/3 bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center h-48 md:h-44 relative">
            {isInView ? (
              <>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white z-20 hover:bg-black/70 transition-colors">
                      <Maximize className="h-3.5 w-3.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[90vh] flex items-center justify-center p-2">
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <OptimizedGifImage 
                        gifUrl={exercise.gif_url}
                        exerciseName={exercise.name}
                        className="max-h-[80vh] max-w-full"
                        showControls={false}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <OptimizedGifImage 
                  gifUrl={exercise.gif_url}
                  exerciseName={exercise.name}
                  className="h-48 md:h-44 w-full"
                  showControls={true}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Dumbbell className="h-8 w-8 mb-2 text-primary/40" />
                <p className="text-sm font-medium">{exercise.name}</p>
              </div>
            )}
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
