
import React from 'react';
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
        {exercise.gif_url && (
          <div className="mb-4 relative pt-[56.25%] flex items-center justify-center bg-white">
            <img
              src={exercise.gif_url}
              alt={exercise.name}
              className="absolute top-0 left-0 w-full h-full object-contain rounded-md"
              onError={(e) => {
                console.error("Error loading GIF:", exercise.gif_url);
                e.currentTarget.src = "/placeholder.svg";
              }}
            />
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
