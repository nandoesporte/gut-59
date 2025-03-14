
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatImageUrl } from '@/utils/imageUtils';
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, AlertCircle, RefreshCw, Maximize } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const [retryCount, setRetryCount] = useState(0);
  const [hasAttemptedToLoadImage, setHasAttemptedToLoadImage] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const isMobile = useIsMobile();
  
  if (!exercise) return null;

  // Reset image states if exercise changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setHasAttemptedToLoadImage(false);
    setRetryCount(0);
    setIsRetrying(false);
    
    // Tentar carregar a imagem quando o componente for montado
    const imageUrl = formatImageUrl(exercise.gif_url);
    console.log(`Tentando carregar imagem para exercício: ${exercise.name} (${exercise.id}), URL: ${imageUrl}`);
  }, [exercise.id, exercise.gif_url, exercise.name]);
  
  // Função para tentar carregar novamente a imagem (até 3 tentativas)
  const retryLoadImage = async () => {
    if (retryCount >= 3) return;
    
    setIsRetrying(true);
    console.log(`Tentando carregar imagem novamente para: ${exercise.name} (${exercise.id}). Tentativa: ${retryCount + 1}`);
    setImageError(false);
    setImageLoaded(false);
    setRetryCount(prevCount => prevCount + 1);
    
    // Buscar a URL mais recente do banco de dados
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('gif_url')
        .eq('id', exercise.id)
        .single();
        
      if (!error && data && data.gif_url) {
        const newGifUrl = formatImageUrl(data.gif_url + `?t=${Date.now()}`);
        console.log(`Nova URL obtida: ${newGifUrl}`);
        if (imageRef.current) {
          imageRef.current.src = newGifUrl;
        }
      } else if (error) {
        console.error('Erro ao buscar URL atualizada:', error);
      }
    } catch (error) {
      console.error('Erro ao buscar URL atualizada:', error);
    } finally {
      // Definir um timeout para limpar o estado de retry se a imagem não carregar
      setTimeout(() => {
        if (isRetrying) {
          setIsRetrying(false);
        }
      }, 5000);
    }
  };
  
  const handleImageError = () => {
    console.warn(`Falha ao carregar imagem para exercício: ${exercise.name} (${exercise.id}). URL: ${exercise.gif_url}`);
    
    if (retryCount < 3) {
      // Tentar carregar novamente automaticamente após um pequeno delay
      setTimeout(retryLoadImage, 1500);
    } else {
      setImageError(true);
      setImageLoaded(true);
      setHasAttemptedToLoadImage(true);
      setIsRetrying(false);
    }
  };
  
  const handleImageLoad = () => {
    console.log(`Imagem carregada com sucesso para: ${exercise.name} (${exercise.id})`);
    setImageLoaded(true);
    setHasAttemptedToLoadImage(true);
    setImageError(false);
    setIsRetrying(false);
  };
  
  // Get the correct image URL, handling null or empty strings
  const imageUrl = formatImageUrl(exercise.gif_url);
  
  // Check if URL is likely valid (not just a placeholder)
  const isLikelyValidUrl = imageUrl && 
                          !imageUrl.includes('placeholder') && 
                          !imageUrl.includes('example.') &&
                          imageUrl.trim().length > 10;
  
  // Adicionar log para depuração
  console.log(`Renderizando exercício: ${exercise.name}, URL: ${imageUrl}, É válida: ${isLikelyValidUrl}`);
  
  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Exercise GIF/Image */}
          <div className="w-full md:w-1/3 bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center h-48 md:h-44 relative">
            {(!imageLoaded || isRetrying) && !imageError && isLikelyValidUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Skeleton className="h-48 md:h-44 w-full absolute inset-0" />
                <span className="text-xs text-muted-foreground z-10 bg-background/80 px-2 py-1 rounded-md flex items-center gap-1">
                  {isRetrying && <RefreshCw className="h-3 w-3 animate-spin" />}
                  {isRetrying ? 'Tentando novamente...' : 'Carregando...'}
                </span>
              </div>
            )}
            
            {(!isLikelyValidUrl || imageError || (hasAttemptedToLoadImage && !imageLoaded)) && (
              <div className="flex flex-col items-center justify-center h-full w-full bg-muted text-center px-2">
                {imageError ? (
                  <AlertCircle className="h-8 w-8 mb-2 text-amber-500" />
                ) : (
                  <Dumbbell className="h-8 w-8 mb-2 text-primary/40" />
                )}
                <p className="text-sm text-muted-foreground">
                  {exercise.name}
                </p>
                <span className="text-xs text-muted-foreground/70 mt-1">
                  {imageError ? 'Imagem não disponível' : 'Sem imagem'}
                </span>
                {imageError && !isRetrying && (
                  <button 
                    className="text-xs text-primary mt-1 hover:underline flex items-center gap-1"
                    onClick={retryLoadImage}
                    disabled={isRetrying}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Tentar novamente
                  </button>
                )}
              </div>
            )}
            
            {isLikelyValidUrl && (
              <>
                <Dialog>
                  <DialogTrigger asChild>
                    <button 
                      className={`absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white z-20 ${imageLoaded && !imageError ? 'block' : 'hidden'}`}
                      onClick={() => {}}
                    >
                      <Maximize className="h-3.5 w-3.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[90vh] flex items-center justify-center p-1 md:p-2">
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <img 
                        src={`${imageUrl}?t=${Date.now()}`}
                        alt={exercise.name}
                        className="max-h-[80vh] max-w-full object-contain"
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <img 
                  ref={imageRef}
                  src={`${imageUrl}?t=${Date.now()}`}
                  alt={exercise.name}
                  className={`h-48 md:h-44 object-contain ${imageLoaded && !imageError ? 'block' : 'hidden'}`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  loading="lazy"
                />
              </>
            )}
          </div>
          
          {/* Exercise Details */}
          <div className="flex-1 p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
              <h4 className="font-medium text-lg md:text-lg">{exercise.name}</h4>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {exercise.muscle_group && (
                  <Badge variant="outline" className="bg-muted/50 text-sm">
                    {exercise.muscle_group.charAt(0).toUpperCase() + exercise.muscle_group.slice(1)}
                  </Badge>
                )}
                {exercise.exercise_type && (
                  <Badge variant="outline" className="bg-primary/10 text-primary text-sm">
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
                <div className="flex flex-wrap gap-2 md:gap-3 my-2 text-sm">
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
                  <div className="mt-2">
                    <p className={`text-sm text-muted-foreground ${!expandDescription && 'line-clamp-2'}`}>
                      {exercise.description}
                    </p>
                    {exercise.description.length > 120 && (
                      <button 
                        className="text-sm text-primary mt-1 hover:underline" 
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
