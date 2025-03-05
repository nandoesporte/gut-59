
import { Badge } from "@/components/ui/badge";
import { SessionExercise } from "../types/workout-plan";
import { useState, useEffect } from "react";

interface WorkoutExerciseDetailProps {
  exerciseSession: SessionExercise;
}

export const WorkoutExerciseDetail = ({ exerciseSession }: WorkoutExerciseDetailProps) => {
  const [imgError, setImgError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  
  useEffect(() => {
    if (exerciseSession.exercise?.gif_url) {
      const url = formatImageUrl(exerciseSession.exercise.gif_url);
      setImgSrc(url);
    } else {
      setImgSrc("/placeholder.svg");
    }
  }, [exerciseSession.exercise?.gif_url]);

  // Função para formatar a URL da imagem
  const formatImageUrl = (url?: string): string => {
    if (!url) return "/placeholder.svg";
    
    // Se for uma URL relativa sem protocolo, adicione https:
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    
    // Se a URL estiver vindo do Supabase storage
    if (url.includes('supabase.co/storage/v1/object/public')) {
      return url;
    }
    
    // Para URLs que não têm protocolo e não começam com //
    if (!url.startsWith('http') && !url.startsWith('//') && !url.startsWith('/')) {
      return `https://${url}`;
    }
    
    return url;
  };

  // Função para tratar erros de carregamento de imagem
  const handleImageError = () => {
    console.error("Error loading GIF:", exerciseSession.exercise?.gif_url);
    setImgError(true);
    setImgSrc("/placeholder.svg");
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-48 h-48 rounded overflow-hidden bg-white flex-shrink-0 flex items-center justify-center">
          {imgError ? (
            <div className="text-gray-400 text-xs text-center p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Imagem não disponível
            </div>
          ) : (
            <img 
              src={imgSrc || "/placeholder.svg"}
              alt={exerciseSession.exercise?.name || "Exercício"}
              className="w-full h-full object-contain"
              loading="lazy"
              onError={handleImageError}
            />
          )}
        </div>
        
        <div className="flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h5 className="font-medium text-gray-900">
              {exerciseSession.exercise?.name}
            </h5>
            {exerciseSession.exercise?.muscle_group && (
              <Badge variant="outline">
                {exerciseSession.exercise.muscle_group.replace('_', ' ')}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <div className="bg-white p-2 rounded">
              <span className="text-xs text-gray-500">Séries</span>
              <p className="font-medium">{exerciseSession.sets}</p>
            </div>
            <div className="bg-white p-2 rounded">
              <span className="text-xs text-gray-500">Repetições</span>
              <p className="font-medium">{exerciseSession.reps}</p>
            </div>
            <div className="bg-white p-2 rounded">
              <span className="text-xs text-gray-500">Descanso</span>
              <p className="font-medium">{exerciseSession.rest_time_seconds}s</p>
            </div>
            {exerciseSession.intensity && (
              <div className="bg-white p-2 rounded">
                <span className="text-xs text-gray-500">Intensidade</span>
                <p className="font-medium">{exerciseSession.intensity}</p>
              </div>
            )}
          </div>
          
          {exerciseSession.exercise?.description && (
            <p className="text-sm text-gray-700 mt-2">
              {exerciseSession.exercise.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
