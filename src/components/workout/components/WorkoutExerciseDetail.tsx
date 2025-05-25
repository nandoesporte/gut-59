
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatImageUrl, testImageUrl, validateGifUrl, debugImageUrl } from '@/utils/imageUtils';
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, AlertCircle, RefreshCw, Maximize, Loader2, Weight, ExternalLink, CheckCircle, Bug } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

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
  const [urlTestResult, setUrlTestResult] = useState<string | null>(null);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isMobile = useIsMobile();
  
  if (!exercise) {
    console.log('❌ Exercise data missing:', exerciseSession);
    return null;
  }

  // Debug da URL na inicialização
  useEffect(() => {
    const debug = debugImageUrl(exercise.gif_url, exercise.name);
    setDebugInfo(debug);
  }, [exercise.gif_url, exercise.name]);

  // Test URL functionality
  const testCurrentUrl = async () => {
    if (!exercise.gif_url) return;
    
    setIsTestingUrl(true);
    const formattedUrl = formatImageUrl(exercise.gif_url);
    
    try {
      const isValid = await testImageUrl(formattedUrl);
      setUrlTestResult(isValid ? 'valid' : 'invalid');
      console.log(`🔗 URL test result for ${exercise.name}:`, isValid ? 'Valid' : 'Invalid');
    } catch (error) {
      setUrlTestResult('error');
      console.error('🔗 URL test error:', error);
    } finally {
      setIsTestingUrl(false);
    }
  };

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

  // Reset image states if exercise changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setRetryCount(0);
    setUrlTestResult(null);
    
    console.log(`🏋️ Loading exercise: ${exercise.name} (${exercise.id})`);
    console.log(`🔗 Original GIF URL from DB:`, exercise.gif_url);
    console.log(`🔗 URL validation:`, validateGifUrl(exercise.gif_url));
  }, [exercise.id, exercise.name, exercise.gif_url]);
  
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`❌ Failed to load image for exercise: ${exercise.name}`);
    console.error(`🔗 URL that failed: ${imageUrl}`);
    console.error(`🔗 Original URL from DB: ${exercise.gif_url}`);
    console.error('🔗 Error event:', event);
    setImageError(true);
    setImageLoaded(true);
  };
  
  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully for: ${exercise.name}`);
    console.log(`🔗 Successfully loaded URL: ${imageUrl}`);
    setImageLoaded(true);
    setImageError(false);
  };

  const handleRetry = () => {
    console.log(`🔄 Retrying image load for: ${exercise.name} (attempt ${retryCount + 1})`);
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    setImageError(false);
    setImageLoaded(false);
    
    if (imageRef.current) {
      // Force reload by changing src with cache busting
      const url = formatImageUrl(exercise.gif_url);
      const separator = url.includes('?') ? '&' : '?';
      imageRef.current.src = `${url}${separator}retry=${newRetryCount}&t=${Date.now()}`;
    }
  };
  
  const handleTestUrl = () => {
    const url = formatImageUrl(exercise.gif_url);
    window.open(url, '_blank');
  };

  const handleDebugUrl = () => {
    console.log('🐛 FULL DEBUG INFO:');
    console.log('🐛 Exercise:', exercise);
    console.log('🐛 Debug Info:', debugInfo);
    console.log('🐛 Current states:', {
      imageLoaded,
      imageError,
      isInView,
      hasValidUrl,
      urlTestResult
    });
  };
  
  const imageUrl = formatImageUrl(exercise.gif_url);
  console.log(`🎯 Formatted URL for ${exercise.name}:`, imageUrl);
  
  // Verificar se a URL parece válida
  const hasValidUrl = validateGifUrl(exercise.gif_url);
  
  console.log(`🔍 URL validation for ${exercise.name}:`, {
    original: exercise.gif_url,
    formatted: imageUrl,
    hasValidUrl,
    length: exercise.gif_url?.length || 0,
    type: typeof exercise.gif_url
  });
  
  return (
    <Card ref={cardRef} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Exercise GIF/Image */}
          <div className="w-full md:w-1/3 bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center h-48 md:h-44 relative">
            {/* Loading skeleton */}
            {(!imageLoaded && isInView && hasValidUrl) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Skeleton className="h-48 md:h-44 w-full absolute inset-0" />
                <span className="text-xs text-muted-foreground z-10 bg-background/80 px-2 py-1 rounded-md flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Carregando GIF...
                </span>
              </div>
            )}
            
            {/* Error state or no valid URL */}
            {(!hasValidUrl || imageError) && (
              <div className="flex flex-col items-center justify-center h-full w-full bg-muted text-center px-2">
                {imageError ? (
                  <>
                    <AlertCircle className="h-8 w-8 mb-2 text-amber-500" />
                    <p className="text-sm text-muted-foreground font-medium mb-2">
                      {exercise.name}
                    </p>
                    <span className="text-xs text-muted-foreground/70 mb-2">
                      Erro ao carregar imagem
                    </span>
                    <div className="text-xs text-red-400 mb-2 px-2 py-1 bg-red-50 rounded max-w-full break-all">
                      URL Original: {exercise.gif_url || 'Não disponível'}
                    </div>
                    <div className="text-xs text-blue-400 mb-2 px-2 py-1 bg-blue-50 rounded max-w-full break-all">
                      URL Formatada: {imageUrl}
                    </div>
                    {urlTestResult && (
                      <div className={`text-xs mb-2 px-2 py-1 rounded flex items-center gap-1 ${
                        urlTestResult === 'valid' ? 'text-green-600 bg-green-50' :
                        urlTestResult === 'invalid' ? 'text-red-600 bg-red-50' :
                        'text-amber-600 bg-amber-50'
                      }`}>
                        {urlTestResult === 'valid' && <CheckCircle className="h-3 w-3" />}
                        {urlTestResult === 'invalid' && <AlertCircle className="h-3 w-3" />}
                        URL: {urlTestResult === 'valid' ? 'Válida' : urlTestResult === 'invalid' ? 'Inválida' : 'Erro no teste'}
                      </div>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      {retryCount < 3 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRetry}
                          className="text-xs h-7"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Tentar novamente
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={testCurrentUrl}
                        disabled={isTestingUrl}
                        className="text-xs h-7"
                      >
                        {isTestingUrl ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        Testar URL
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestUrl}
                        className="text-xs h-7"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir URL
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDebugUrl}
                        className="text-xs h-7"
                      >
                        <Bug className="h-3 w-3 mr-1" />
                        Debug
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Dumbbell className="h-8 w-8 mb-2 text-primary/40" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {exercise.name}
                    </p>
                    <span className="text-xs text-muted-foreground/70 mt-1">
                      URL inválida ou sem imagem
                    </span>
                    <div className="text-xs text-gray-400 mt-1 px-2 py-1 bg-gray-50 rounded max-w-full break-all">
                      URL: {exercise.gif_url || 'Não disponível'}
                    </div>
                    <div className="flex gap-1 flex-wrap mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={testCurrentUrl}
                        disabled={isTestingUrl}
                        className="text-xs h-7"
                      >
                        {isTestingUrl ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        Testar URL
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDebugUrl}
                        className="text-xs h-7"
                      >
                        <Bug className="h-3 w-3 mr-1" />
                        Debug
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* Renderizar imagem quando estiver em view e URL for válida */}
            {isInView && hasValidUrl && (
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
