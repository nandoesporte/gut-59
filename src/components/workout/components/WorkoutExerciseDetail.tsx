
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatImageUrl } from '@/utils/imageUtils';
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, AlertCircle, RefreshCw, Maximize, Loader2, Weight } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface WorkoutExerciseDetailProps {
  exerciseSession: any;
  showDetails?: boolean;
}

export const WorkoutExerciseDetail = ({ exerciseSession, showDetails = true }: WorkoutExerciseDetailProps) => {
  const exercise = exerciseSession.exercise;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [expandDescription, setExpandDescription] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isMobile = useIsMobile();
  
  if (!exercise) {
    console.log('❌ Exercise data missing:', exerciseSession);
    return null;
  }

  // Log exercise data for debugging
  useEffect(() => {
    console.log('🏋️ Exercise Debug Info:', {
      exerciseName: exercise.name,
      exerciseId: exercise.id,
      originalGifUrl: exercise.gif_url,
      hasGifUrl: !!exercise.gif_url,
      gifUrlLength: exercise.gif_url?.length || 0,
    });
  }, [exercise]);

  // Intersection Observer para lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          console.log(`📺 Exercise ${exercise.name} entered viewport`);
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '50px',
        threshold: 0.1 
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [exercise.name]);

  // Reset image states if exercise changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setRetryCount(0);
    
    console.log(`🔄 Loading exercise: ${exercise.name} (${exercise.id})`);
    console.log(`🔗 Original GIF URL: ${exercise.gif_url}`);
  }, [exercise.id, exercise.name, exercise.gif_url]);
  
  const handleImageError = () => {
    console.error(`❌ Failed to load image for exercise: ${exercise.name} (${exercise.id})`);
    console.error(`❌ Failed URL: ${exercise.gif_url}`);
    console.error(`❌ Formatted URL: ${imageUrl}`);
    console.error(`❌ Retry count: ${retryCount}`);
    
    if (retryCount < 2) {
      console.log(`🔄 Retrying image load for ${exercise.name} (attempt ${retryCount + 1})`);
      setRetryCount(prev => prev + 1);
      // Force reload after a short delay
      setTimeout(() => {
        if (imageRef.current) {
          imageRef.current.src = imageUrl + `?retry=${retryCount + 1}`;
        }
      }, 1000);
    } else {
      setImageError(true);
      setImageLoaded(true);
    }
  };
  
  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully for: ${exercise.name} (${exercise.id})`);
    console.log(`✅ Loaded URL: ${imageUrl}`);
    setImageLoaded(true);
    setImageError(false);
  };
  
  // Melhor validação da URL
  const imageUrl = exercise.gif_url ? formatImageUrl(exercise.gif_url) : null;
  
  console.log(`🔍 Image validation for ${exercise.name}:`, {
    hasOriginalUrl: !!exercise.gif_url,
    originalUrl: exercise.gif_url,
    formattedUrl: imageUrl,
    urlLength: exercise.gif_url?.length || 0
  });
  
  const isLikelyValidUrl = imageUrl && 
                          imageUrl.trim().length > 10 &&
                          imageUrl.includes('supabase.co') &&
                          imageUrl.includes('/storage/v1/object/public/') &&
                          !imageUrl.includes('placeholder') && 
                          !imageUrl.includes('example.') &&
                          !imageUrl.includes('null') &&
                          !imageUrl.includes('undefined');
  
  console.log(`🎯 URL validation result for ${exercise.name}: ${isLikelyValidUrl ? 'VALID' : 'INVALID'}`);
  if (isLikelyValidUrl) {
    console.log(`📸 Will attempt to load: ${imageUrl}`);
  }
  
  return (
    <Card ref={cardRef} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Exercise GIF/Image */}
          <div className="w-full md:w-1/3 bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center h-48 md:h-44 relative">
            {/* Debug info in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="absolute top-0 left-0 z-30 bg-black/70 text-white text-xs p-1 max-w-full overflow-hidden">
                ID: {exercise.id}, GIF: {exercise.gif_url ? 'exists' : 'missing'}
              </div>
            )}
            
            {/* Loading state */}
            {(!imageLoaded && isInView && isLikelyValidUrl && !imageError) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Skeleton className="h-48 md:h-44 w-full absolute inset-0" />
                <span className="text-xs text-muted-foreground z-10 bg-background/80 px-2 py-1 rounded-md flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Carregando GIF...
                </span>
              </div>
            )}
            
            {/* Error state */}
            {(!isLikelyValidUrl || imageError) && (
              <div className="flex flex-col items-center justify-center h-full w-full bg-muted text-center px-2">
                {imageError ? (
                  <>
                    <AlertCircle className="h-8 w-8 mb-2 text-amber-500" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {exercise.name}
                    </p>
                    <span className="text-xs text-muted-foreground/70 mt-1">
                      Erro ao carregar GIF
                    </span>
                    <button 
                      onClick={() => {
                        setImageError(false);
                        setImageLoaded(false);
                        setRetryCount(0);
                        if (imageRef.current && imageUrl) {
                          imageRef.current.src = imageUrl + `?retry=${Date.now()}`;
                        }
                      }}
                      className="text-xs text-primary mt-1 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Tentar novamente
                    </button>
                  </>
                ) : (
                  <>
                    <Dumbbell className="h-8 w-8 mb-2 text-primary/40" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {exercise.name}
                    </p>
                    <span className="text-xs text-muted-foreground/70 mt-1">
                      GIF não disponível
                    </span>
                  </>
                )}
                {process.env.NODE_ENV === 'development' && (
                  <span className="text-xs text-red-500 mt-1 break-all max-w-full">
                    URL: {exercise.gif_url || 'N/A'}
                  </span>
                )}
              </div>
            )}
            
            {/* Image element - só renderizar quando estiver em view e URL for válida */}
            {isInView && isLikelyValidUrl && (
              <>
                <Dialog>
                  <DialogTrigger asChild>
                    <button 
                      className={`absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white z-20 transition-opacity ${imageLoaded && !imageError ? 'opacity-100' : 'opacity-0'}`}
                    >
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

                <img 
                  ref={imageRef}
                  src={imageUrl}
                  alt={exercise.name}
                  className={`h-48 md:h-44 w-full object-contain transition-opacity duration-300 ${imageLoaded && !imageError ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  loading="lazy"
                  decoding="async"
                  crossOrigin="anonymous"
                />
              </>
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
                  {exerciseSession.recommended_weight && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md font-medium flex items-center gap-1">
                      <Weight className="h-3 w-3" />
                      {exerciseSession.recommended_weight}
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
