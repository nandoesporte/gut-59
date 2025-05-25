
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatImageUrl } from '@/utils/imageUtils';
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, AlertCircle, Maximize, Weight } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface WorkoutExerciseDetailProps {
  exerciseSession: any;
  showDetails?: boolean;
}

export const WorkoutExerciseDetail = ({ exerciseSession, showDetails = true }: WorkoutExerciseDetailProps) => {
  const exercise = exerciseSession.exercise;
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [expandDescription, setExpandDescription] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const isMobile = useIsMobile();
  
  if (!exercise) {
    console.log('Exercise data missing:', exerciseSession);
    return null;
  }

  const imageUrl = exercise.gif_url ? formatImageUrl(exercise.gif_url) : null;
  
  // Reset image status when exercise changes
  useEffect(() => {
    setImageStatus('loading');
    console.log(`Loading exercise: ${exercise.name} (${exercise.id})`);
    console.log('Image URL:', imageUrl);
  }, [exercise.id, imageUrl]);
  
  const handleImageError = () => {
    console.error(`Failed to load image for exercise: ${exercise.name}. URL: ${imageUrl}`);
    setImageStatus('error');
  };
  
  const handleImageLoad = () => {
    console.log(`Image loaded successfully for: ${exercise.name}`);
    setImageStatus('loaded');
  };
  
  const shouldShowImage = imageUrl && 
                         imageUrl !== '/placeholder.svg' && 
                         !imageUrl.includes('placeholder') && 
                         !imageUrl.includes('example.');
  
  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Exercise GIF/Image */}
          <div className="w-full md:w-1/3 bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center h-48 md:h-44 relative">
            {shouldShowImage ? (
              <>
                {/* Loading skeleton */}
                {imageStatus === 'loading' && (
                  <div className="absolute inset-0">
                    <Skeleton className="h-full w-full" />
                  </div>
                )}
                
                {/* Expand button */}
                {imageStatus === 'loaded' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white z-20 hover:bg-black/70 transition-colors">
                        <Maximize className="h-3.5 w-3.5" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] flex items-center justify-center p-2">
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <img 
                          src={imageUrl}
                          alt={exercise.name}
                          className="max-h-[80vh] max-w-full object-contain"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Main image */}
                <img 
                  ref={imageRef}
                  src={imageUrl}
                  alt={exercise.name}
                  className={`h-full w-full object-contain transition-opacity duration-300 ${
                    imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  loading="lazy"
                />
                
                {/* Error state */}
                {imageStatus === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-center px-2">
                    <AlertCircle className="h-8 w-8 mb-2 text-amber-500" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {exercise.name}
                    </p>
                    <span className="text-xs text-muted-foreground/70 mt-1">
                      Imagem não disponível
                    </span>
                  </div>
                )}
              </>
            ) : (
              /* Fallback when no valid image */
              <div className="flex flex-col items-center justify-center h-full w-full bg-muted text-center px-2">
                <Dumbbell className="h-8 w-8 mb-2 text-primary/40" />
                <p className="text-sm text-muted-foreground font-medium">
                  {exercise.name}
                </p>
                <span className="text-xs text-muted-foreground/70 mt-1">
                  Sem imagem disponível
                </span>
              </div>
            )}
          </div>
          
          {/* Exercise Details */}
          <div className="flex-1 p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
              <h4 className="font-semibold text-lg line-clamp-2">{exercise.name}</h4>
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
                  {exerciseSession.recommended_weight && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md font-medium flex items-center gap-1">
                      <Weight className="h-3 w-3" />
                      {exerciseSession.recommended_weight}
                    </span>
                  )}
                </div>
                
                {exercise.description && (
                  <div className="mt-2">
                    <p className={`text-sm text-muted-foreground ${!expandDescription ? 'line-clamp-3' : ''}`}>
                      {exercise.description}
                    </p>
                    {exercise.description.length > 150 && (
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
