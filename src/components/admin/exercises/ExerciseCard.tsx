
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatImageUrl } from "@/utils/imageUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExerciseForm } from './ExerciseForm';

interface ExerciseCardProps {
  exercise: any;
  onUpdate: () => void;
}

export const ExerciseCard = ({ exercise, onUpdate }: ExerciseCardProps) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  useEffect(() => {
    setImageStatus('loading');
  }, [exercise.gif_url, exercise.id]);

  const handleImageLoad = () => {
    console.log(`Successfully loaded image for ${exercise.name}`);
    setImageStatus('loaded');
  };

  const handleImageError = () => {
    console.error(`Error loading GIF for ${exercise.name}:`, exercise.gif_url);
    setImageStatus('error');
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

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    onUpdate();
    toast.success('Exercício atualizado com sucesso!');
  };

  const imageUrl = formatImageUrl(exercise.gif_url);
  const shouldShowImage = imageUrl && imageUrl !== '/placeholder.svg';

  return (
    <>
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{exercise.name}</CardTitle>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative pt-[56.25%] flex items-center justify-center bg-gray-100 rounded-md">
            {shouldShowImage ? (
              <>
                <img
                  src={imageUrl}
                  alt={exercise.name}
                  className={`absolute top-0 left-0 w-full h-full object-contain rounded-md transition-opacity duration-300 ${
                    imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
                  }`}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                />
                {imageStatus === 'loading' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
                {imageStatus === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
                    <div className="text-gray-400 text-center p-2">
                      <Dumbbell className="h-10 w-10 mx-auto mb-1" />
                      <p className="text-xs">{exercise.name}</p>
                      <p className="text-xs mt-1">Imagem não disponível</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-400 text-center p-2">
                  <Dumbbell className="h-10 w-10 mx-auto mb-1" />
                  <p className="text-xs">{exercise.name}</p>
                  <p className="text-xs mt-1">Sem imagem</p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <p><strong>Tipo:</strong> {exercise.exercise_type}</p>
            <p><strong>Grupo Muscular:</strong> {exercise.muscle_group}</p>
            <p><strong>Séries:</strong> {exercise.min_sets}-{exercise.max_sets}</p>
            <p><strong>Repetições:</strong> {exercise.min_reps}-{exercise.max_reps}</p>
            {exercise.description && (
              <p className="text-muted-foreground line-clamp-3">{exercise.description}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Exercício</DialogTitle>
          </DialogHeader>
          <ExerciseForm 
            onSuccess={handleEditSuccess} 
            onCancel={() => setIsEditDialogOpen(false)}
            editMode={true}
            exerciseData={exercise}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
