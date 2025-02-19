
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadCloud } from "lucide-react";
import { categories } from "./categoryOptions";
import { Exercise, ExerciseType, MuscleGroup, Difficulty } from "./types";

interface FileWithPreview extends File {
  preview?: string;
}

interface ExerciseFormProps {
  onSubmit: (exerciseData: Omit<Exercise, 'id' | 'gif_url'>, file?: File) => Promise<void>;
  uploading: boolean;
}

export const ExerciseForm = ({ onSubmit, uploading }: ExerciseFormProps) => {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [newExercise, setNewExercise] = useState({
    name: "",
    description: "",
    muscle_group: "chest" as MuscleGroup,
    exercise_type: "strength" as ExerciseType,
    difficulty: "beginner" as Difficulty
  });

  const validateFile = (file: File) => {
    if (!file.type.includes('gif')) {
      throw new Error(`${file.name} não é um arquivo GIF`);
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`${file.name} excede o tamanho máximo de 5MB`);
    }

    return true;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(validateFile);
    
    const filesWithPreview = validFiles.map(file => {
      const preview = URL.createObjectURL(file);
      return Object.assign(file, { preview });
    });

    setSelectedFiles(filesWithPreview);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(newExercise, selectedFiles[0]);
    setNewExercise({
      name: "",
      description: "",
      muscle_group: "chest",
      exercise_type: "strength",
      difficulty: "beginner"
    });
    setSelectedFiles([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Exercício</Label>
        <Input
          id="name"
          value={newExercise.name}
          onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="exercise_type">Tipo de Exercício</Label>
          <Select
            value={newExercise.exercise_type}
            onValueChange={(value: ExerciseType) => 
              setNewExercise(prev => ({ ...prev, exercise_type: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strength">Força</SelectItem>
              <SelectItem value="cardio">Cardio</SelectItem>
              <SelectItem value="mobility">Mobilidade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="muscle_group">Grupo Muscular</Label>
          <Select
            value={newExercise.muscle_group}
            onValueChange={(value: MuscleGroup) => 
              setNewExercise(prev => ({ ...prev, muscle_group: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o grupo muscular" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="difficulty">Dificuldade</Label>
          <Select
            value={newExercise.difficulty}
            onValueChange={(value: Difficulty) => 
              setNewExercise(prev => ({ ...prev, difficulty: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a dificuldade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Iniciante</SelectItem>
              <SelectItem value="intermediate">Intermediário</SelectItem>
              <SelectItem value="advanced">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={newExercise.description}
          onChange={(e) => setNewExercise(prev => ({ ...prev, description: e.target.value }))}
          className="min-h-[100px]"
        />
      </div>

      <div>
        <Label htmlFor="gif">GIF do Exercício (Max: 5MB)</Label>
        <Input
          id="gif"
          type="file"
          accept=".gif"
          onChange={handleFileSelect}
          className="mt-1"
        />
        {selectedFiles.length > 0 && (
          <div className="mt-2 flex gap-2">
            {selectedFiles.map((file) => (
              <img
                key={file.name}
                src={file.preview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded border"
              />
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={uploading}>
        {uploading ? (
          <>Salvando...</>
        ) : (
          <>
            <UploadCloud className="w-4 h-4 mr-2" />
            Salvar Exercício
          </>
        )}
      </Button>
    </form>
  );
};

