
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Exercise } from "./types";
import { ExerciseCard } from "./ExerciseCard";

interface ExerciseListProps {
  exercises: Exercise[];
  onRemoveGif: (exerciseId: string, fileName: string) => Promise<void>;
}

export const ExerciseList = ({ exercises, onRemoveGif }: ExerciseListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercícios Cadastrados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onRemoveGif={(fileName) => onRemoveGif(exercise.id, fileName)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

