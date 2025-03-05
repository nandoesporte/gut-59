
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExerciseCardProps {
  exercise: any;
  onUpdate: () => void;
}

export const ExerciseCard = ({ exercise, onUpdate }: ExerciseCardProps) => {
  const [imgError, setImgError] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este exercício?')) return;

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exercise.id);

      if (error) throw error;
      
      onUpdate();
      toast.success('Exercício excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast.error('Erro ao excluir exercício');
    }
  };

  // Função para garantir que a URL esteja correta
  const getImageUrl = (url?: string) => {
    if (!url) return "/placeholder.svg";
    
    // Se for uma URL relativa sem protocolo, adicione https:
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    
    return url;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("Error loading GIF:", exercise.gif_url);
    setImgError(true);
    e.currentTarget.src = "/placeholder.svg";
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{exercise.name}</CardTitle>
          <div className="flex gap-2">
            <Button size="icon" variant="outline">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {exercise.gif_url && (
          <div className="mb-4 relative pt-[56.25%] flex items-center justify-center bg-white">
            {imgError ? (
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
                <div className="text-gray-400 text-xs text-center p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Imagem não disponível
                </div>
              </div>
            ) : (
              <img
                src={getImageUrl(exercise.gif_url)}
                alt={exercise.name}
                className="absolute top-0 left-0 w-full h-full object-contain rounded-md"
                onError={handleImageError}
              />
            )}
          </div>
        )}
        <div className="space-y-2 text-sm">
          <p><strong>Tipo:</strong> {exercise.exercise_type}</p>
          <p><strong>Grupo Muscular:</strong> {exercise.muscle_group}</p>
          <p><strong>Séries:</strong> {exercise.min_sets}-{exercise.max_sets}</p>
          <p><strong>Repetições:</strong> {exercise.min_reps}-{exercise.max_reps}</p>
          {exercise.description && (
            <p className="text-muted-foreground">{exercise.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
