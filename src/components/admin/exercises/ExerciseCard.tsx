
import { Button } from "@/components/ui/button";
import { Exercise } from "./types";
import { AlertCircle, Trash2 } from "lucide-react";

interface ExerciseCardProps {
  exercise: Exercise;
  onRemoveGif: (fileName: string) => void;
}

export const ExerciseCard = ({ exercise, onRemoveGif }: ExerciseCardProps) => {
  return (
    <div className="border p-4 rounded-lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-medium">{exercise.name}</h3>
          <div className="flex gap-2 items-center mt-2">
            <span className="px-2 py-1 text-xs rounded bg-primary/10 text-primary">
              {exercise.exercise_type}
            </span>
            <span className="px-2 py-1 text-xs rounded bg-secondary/10 text-secondary">
              {exercise.muscle_group}
            </span>
            <span className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground">
              {exercise.difficulty}
            </span>
          </div>
          {exercise.description && (
            <p className="text-sm mt-2">{exercise.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {exercise.gif_url ? (
            <div className="flex items-center gap-2">
              <img
                src={exercise.gif_url}
                alt="Demonstração do exercício"
                className="w-16 h-16 object-cover rounded"
              />
              <Button
                variant="destructive"
                size="icon"
                onClick={() => {
                  const fileName = exercise.gif_url!.split('/').pop();
                  if (fileName) onRemoveGif(fileName);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Sem GIF</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

