
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatImageUrl } from "@/utils/imageUtils";

interface ExerciseCardProps {
  exercise: any;
  onUpdate: () => void;
}

export const ExerciseCard = ({ exercise, onUpdate }: ExerciseCardProps) => {
  const [imgError, setImgError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(true);
    setImgError(false);
    
    if (exercise.gif_url) {
      const url = formatImageUrl(exercise.gif_url);
      console.log(`Exercise ${exercise.id} (${exercise.name}) - Formatted URL: ${url}`);
      setImgSrc(url);
    } else {
      setImgSrc("/placeholder.svg");
      setIsLoading(false);
    }
  }, [exercise.gif_url, exercise.id, exercise.name]);

  const handleImageLoad = () => {
    console.log(`Successfully loaded image for ${exercise.name}`);
    setIsLoading(false);
  };

  const handleImageError = () => {
    console.error(`Error loading GIF for ${exercise.name}:`, exercise.gif_url);
    setImgError(true);
    setImgSrc("/placeholder.svg");
    setIsLoading(false);
  };

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
        <div className="mb-4 relative pt-[56.25%] flex items-center justify-center bg-white">
          {isLoading && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {imgError ? (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
              <div className="text-gray-400 text-center p-2">
                <Dumbbell className="h-10 w-10 mx-auto mb-1" />
                <p className="text-xs">{exercise.name}</p>
                <p className="text-xs mt-1">Imagem não disponível</p>
              </div>
            </div>
          ) : (
            <img
              src={imgSrc || "/placeholder.svg"}
              alt={exercise.name}
              className="absolute top-0 left-0 w-full h-full object-contain rounded-md"
              onError={handleImageError}
              onLoad={handleImageLoad}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}
        </div>
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
