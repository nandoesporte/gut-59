
import React, { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, ExternalLink, Dumbbell, Eye } from 'lucide-react';
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
  const [imageStatus, setImageStatus] = useState<string>('loading');

  const hasValidUrl = validateGifUrl(gifUrl);
  const imageUrl = formatImageUrl(gifUrl);

  console.log(`🎯 OptimizedGifImage - Exercise: ${exerciseName}`);
  console.log(`🎯 Original URL: ${gifUrl}`);
  console.log(`🎯 Formatted URL: ${imageUrl}`);
  console.log(`🎯 Has valid URL: ${hasValidUrl}`);
  console.log(`🎯 Current status: ${imageStatus}`);

  // Reset states when URL changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setRetryCount(0);
    setUrlTestResult(null);
    setImageStatus('loading');
  }, [gifUrl]);

  const handleImageError = (event: any) => {
    console.error(`❌ Failed to load image for: ${exerciseName}`);
    console.error(`🔗 Failed URL: ${imageUrl}`);
    console.error(`🔗 Error event:`, event);
    console.error(`🔗 Image natural width:`, event.target?.naturalWidth);
    console.error(`🔗 Image natural height:`, event.target?.naturalHeight);
    setImageError(true);
    setImageLoaded(true);
    setImageStatus('error');
  };

  const handleImageLoad = (event: any) => {
    console.log(`✅ Image loaded successfully for: ${exerciseName}`);
    console.log(`🔗 Image natural width:`, event.target?.naturalWidth);
    console.log(`🔗 Image natural height:`, event.target?.naturalHeight);
    console.log(`🔗 Loaded URL: ${imageUrl}`);
    setImageLoaded(true);
    setImageError(false);
    setImageStatus('loaded');
  };

  const handleRetry = () => {
    console.log(`🔄 Retrying image load for: ${exerciseName}`);
    setRetryCount(prev => prev + 1);
    setImageError(false);
    setImageLoaded(false);
    setImageStatus('retrying');
    
    // Force a reload by updating the URL with a cache-busting parameter
    const img = document.querySelector(`img[alt="${exerciseName}"]`) as HTMLImageElement;
    if (img) {
      const separator = imageUrl.includes('?') ? '&' : '?';
      img.src = `${imageUrl}${separator}retry=${retryCount + 1}&t=${Date.now()}`;
    }
  };

  const testCurrentUrl = async () => {
    setIsTestingUrl(true);
    console.log(`🔍 Testing URL: ${imageUrl}`);
    
    try {
      // Test 1: Basic fetch
      const response = await fetch(imageUrl, { 
        method: 'HEAD',
        mode: 'cors'
      });
      
      console.log(`🔍 Response status: ${response.status}`);
      console.log(`🔍 Response headers:`, response.headers);
      
      if (response.ok) {
        setUrlTestResult('valid');
        console.log(`🔍 URL is valid and accessible`);
      } else {
        setUrlTestResult('invalid');
        console.log(`🔍 URL returned status: ${response.status}`);
      }
    } catch (error) {
      console.error(`🔍 Error testing URL:`, error);
      setUrlTestResult('error');
    } finally {
      setIsTestingUrl(false);
    }
  };

  const openUrlInNewTab = () => {
    console.log(`🔗 Opening URL in new tab: ${imageUrl}`);
    window.open(imageUrl, '_blank');
  };

  const previewImage = () => {
    console.log(`👁️ Previewing image: ${imageUrl}`);
    const img = new Image();
    img.onload = () => {
      console.log(`✅ Preview loaded successfully: ${img.naturalWidth}x${img.naturalHeight}`);
      alert(`Imagem carregada com sucesso!\nDimensões: ${img.naturalWidth}x${img.naturalHeight}px`);
    };
    img.onerror = (error) => {
      console.error(`❌ Preview failed:`, error);
      alert('Erro ao carregar a imagem para preview');
    };
    img.src = imageUrl;
  };

  if (!hasValidUrl || imageError) {
    return (
      <div className={`${className} bg-muted flex flex-col items-center justify-center text-center p-2`}>
        <AlertCircle className="h-8 w-8 mb-2 text-amber-500" />
        <p className="text-sm font-medium mb-1">{exerciseName}</p>
        <span className="text-xs text-muted-foreground mb-2">
          {imageError ? `Erro ao carregar (tentativa ${retryCount + 1})` : 'URL inválida'}
        </span>
        
        {showControls && (
          <div className="flex flex-col gap-1 w-full">
            <div className="text-xs break-all px-2 py-1 bg-background rounded border max-h-20 overflow-y-auto">
              <strong>Original:</strong> {gifUrl || 'N/A'}
            </div>
            <div className="text-xs break-all px-2 py-1 bg-background rounded border max-h-20 overflow-y-auto">
              <strong>Formatada:</strong> {imageUrl}
            </div>
            <div className="text-xs px-2 py-1 bg-background rounded border">
              <strong>Status:</strong> {imageStatus}
            </div>
            
            {urlTestResult && (
              <div className={`text-xs px-2 py-1 rounded ${
                urlTestResult === 'valid' ? 'bg-green-100 text-green-700' :
                urlTestResult === 'invalid' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                Status do teste: {urlTestResult === 'valid' ? 'Válida' : 
                                urlTestResult === 'invalid' ? 'Inválida' : 'Erro'}
              </div>
            )}
            
            <div className="flex gap-1 mt-1">
              {retryCount < 5 && (
                <Button size="sm" variant="outline" onClick={handleRetry} className="text-xs h-6 flex-1">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry {retryCount > 0 && `(${retryCount})`}
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={testCurrentUrl}
                disabled={isTestingUrl}
                className="text-xs h-6 flex-1"
              >
                {isTestingUrl ? 'Testing...' : 'Test'}
              </Button>
              <Button size="sm" variant="outline" onClick={previewImage} className="text-xs h-6 flex-1">
                <Eye className="h-3 w-3" />
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
    <div className={`${className} relative overflow-hidden bg-gray-100 dark:bg-gray-800`}>
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
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      
      {showControls && imageLoaded && !imageError && (
        <div className="absolute bottom-1 right-1">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={openUrlInNewTab} 
            className="text-xs h-6 bg-background/80 hover:bg-background"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
