
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatImageUrl, validateGifUrl } from '@/utils/imageUtils';
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, AlertCircle, Maximize, Weight, ExternalLink } from 'lucide-react';
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
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isMobile = useIsMobile();
  
  if (!exercise) {
    console.log('WorkoutExerciseDetail: Exercise data missing:', exerciseSession);
    return null;
  }

  const imageUrl = exercise.gif_url ? formatImageUrl(exercise.gif_url) : null;
  
  // Debug da URL final - LOG COMPLETO SEM TRUNCAR
  useEffect(() => {
    console.log(`\n=== WorkoutExerciseDetail: Exercise "${exercise.name}" (ID: ${exercise.id}) ===`);
    console.log('Raw gif_url:', exercise.gif_url);
    console.log('Formatted imageUrl (COMPLETE):', imageUrl);
    console.log('ImageUrl length:', imageUrl?.length);
    setFinalImageUrl(imageUrl);
  }, [exercise.id, exercise.gif_url, imageUrl, exercise.name]);
  
  // Reset image status when exercise changes
  useEffect(() => {
    setImageStatus('loading');
    
    if (finalImageUrl && finalImageUrl !== '/placeholder.svg') {
      console.log(`\n=== Loading image for ${exercise.name} ===`);
      console.log('COMPLETE URL:', finalImageUrl);
      console.log('URL length:', finalImageUrl.length);
    }
  }, [exercise.id, finalImageUrl, exercise.name]);
  
  const handleImageError = (event: any) => {
    const imgElement = event.target as HTMLImageElement;
    console.error(`\n=== IMAGE LOAD ERROR ===`);
    console.error('Exercise:', exercise.name);
    console.error('Failed URL (COMPLETE):', imgElement.src);
    console.error('Original gif_url:', exercise.gif_url);
    console.error('Event:', event);
    setImageStatus('error');
  };
  
  const handleImageLoad = () => {
    console.log(`\n=== IMAGE LOAD SUCCESS ===`);
    console.log('Exercise:', exercise.name);
    console.log('Successful URL (COMPLETE):', finalImageUrl);
    setImageStatus('loaded');
  };
  
  const shouldShowImage = finalImageUrl && 
                         finalImageUrl !== '/placeholder.svg' && 
                         !finalImageUrl.includes('placeholder') && 
                         !finalImageUrl.includes('example.');

  const testImageUrl = () => {
    if (finalImageUrl) {
      window.open(finalImageUrl, '_blank');
    }
  };
  
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xs text-muted-foreground">Carregando...</div>
                    </div>
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
                          src={finalImageUrl}
                          alt={exercise.name}
                          className="max-h-[80vh] max-w-full object-contain"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Main image - RENDERIZAÇÃO COM URL COMPLETA */}
                <img 
                  ref={imageRef}
                  src={finalImageUrl}
                  alt={exercise.name}
                  className={`h-full w-full object-contain transition-opacity duration-300 ${
                    imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  loading="lazy"
                />
                
                {/* Error state com URL completa visível */}
                {imageStatus === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-center px-2">
                    <AlertCircle className="h-8 w-8 mb-2 text-red-500" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {exercise.name}
                    </p>
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs">
                      <p className="text-red-600 dark:text-red-400 font-medium mb-1">Erro ao carregar</p>
                      <p className="text-red-500 dark:text-red-300 break-all font-mono text-[10px]">
                        {finalImageUrl}
                      </p>
                      <button 
                        onClick={testImageUrl}
                        className="mt-1 text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Testar URL
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Fallback quando não há imagem válida */
              <div className="flex flex-col items-center justify-center h-full w-full bg-muted text-center px-2">
                <Dumbbell className="h-8 w-8 mb-2 text-primary/40" />
                <p className="text-sm text-muted-foreground font-medium">
                  {exercise.name}
                </p>
                <span className="text-xs text-muted-foreground/70 mt-1">
                  Imagem não disponível
                </span>
                {exercise.gif_url && (
                  <div className="mt-2 p-2 bg-muted/50 rounded">
                    <span className="text-xs text-muted-foreground/70 font-mono break-all">
                      Raw: {exercise.gif_url}
                    </span>
                  </div>
                )}
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
