
import React, { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, ExternalLink, Dumbbell } from 'lucide-react';
import { formatImageUrl, testImageUrl, validateGifUrl } from '@/utils/imageUtils';

interface OptimizedGifImageProps {
  gifUrl: string | null;
  exerciseName: string;
  className?: string;
  showControls?: boolean;
}

export const OptimizedGifImage = ({ 
  gifUrl, 
  exerciseName, 
  className = "h-48 md:h-44 w-full",
  showControls = true 
}: OptimizedGifImageProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [urlTestResult, setUrlTestResult] = useState<string | null>(null);

  const hasValidUrl = validateGifUrl(gifUrl);
  const imageUrl = formatImageUrl(gifUrl);

  console.log(`🎯 OptimizedGifImage - Exercise: ${exerciseName}`);
  console.log(`🎯 Original URL: ${gifUrl}`);
  console.log(`🎯 Formatted URL: ${imageUrl}`);
  console.log(`🎯 Has valid URL: ${hasValidUrl}`);

  // Reset states when URL changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setRetryCount(0);
    setUrlTestResult(null);
  }, [gifUrl]);

  const handleImageError = () => {
    console.error(`❌ Failed to load image for: ${exerciseName}`);
    console.error(`🔗 Failed URL: ${imageUrl}`);
    setImageError(true);
    setImageLoaded(true);
  };

  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully for: ${exerciseName}`);
    setImageLoaded(true);
    setImageError(false);
  };

  const handleRetry = () => {
    console.log(`🔄 Retrying image load for: ${exerciseName}`);
    setRetryCount(prev => prev + 1);
    setImageError(false);
    setImageLoaded(false);
  };

  const testCurrentUrl = async () => {
    setIsTestingUrl(true);
    try {
      const isValid = await testImageUrl(imageUrl);
      setUrlTestResult(isValid ? 'valid' : 'invalid');
    } catch (error) {
      setUrlTestResult('error');
    } finally {
      setIsTestingUrl(false);
    }
  };

  const openUrlInNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  if (!hasValidUrl || imageError) {
    return (
      <div className={`${className} bg-muted flex flex-col items-center justify-center text-center p-2`}>
        <AlertCircle className="h-8 w-8 mb-2 text-amber-500" />
        <p className="text-sm font-medium mb-1">{exerciseName}</p>
        <span className="text-xs text-muted-foreground mb-2">
          {imageError ? 'Erro ao carregar' : 'URL inválida'}
        </span>
        
        {showControls && (
          <div className="flex flex-col gap-1 w-full">
            <div className="text-xs break-all px-2 py-1 bg-background rounded border max-h-20 overflow-y-auto">
              Original: {gifUrl || 'N/A'}
            </div>
            <div className="text-xs break-all px-2 py-1 bg-background rounded border max-h-20 overflow-y-auto">
              Formatada: {imageUrl}
            </div>
            
            {urlTestResult && (
              <div className={`text-xs px-2 py-1 rounded ${
                urlTestResult === 'valid' ? 'bg-green-100 text-green-700' :
                urlTestResult === 'invalid' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                Status: {urlTestResult === 'valid' ? 'Válida' : 
                        urlTestResult === 'invalid' ? 'Inválida' : 'Erro'}
              </div>
            )}
            
            <div className="flex gap-1 mt-1">
              {retryCount < 3 && (
                <Button size="sm" variant="outline" onClick={handleRetry} className="text-xs h-6 flex-1">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={testCurrentUrl}
                disabled={isTestingUrl}
                className="text-xs h-6 flex-1"
              >
                Test
              </Button>
              <Button size="sm" variant="outline" onClick={openUrlInNewTab} className="text-xs h-6 flex-1">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="h-full w-full" />
          <div className="absolute flex items-center gap-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
            <Dumbbell className="h-3 w-3 animate-pulse" />
            Carregando...
          </div>
        </div>
      )}
      
      <img 
        src={imageUrl}
        alt={exerciseName}
        className={`${className} object-contain transition-opacity duration-300 ${
          imageLoaded && !imageError ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};
