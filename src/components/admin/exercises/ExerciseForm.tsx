
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
import { Switch } from "@/components/ui/switch";
import { UploadCloud } from "lucide-react";
import { Exercise, ExerciseType, MuscleGroup, Difficulty } from "./types";

interface FileWithPreview extends File {
  preview?: string;
}

interface ExerciseFormProps {
  onSubmit: (exerciseData: Omit<Exercise, 'id' | 'gif_url'>, file?: File) => Promise<void>;
  uploading: boolean;
}

const trainingLocations = [
  { value: "gym", label: "Academia" },
  { value: "home", label: "Casa" },
  { value: "outdoors", label: "Ao ar livre" },
  { value: "no_equipment", label: "Sem equipamentos" }
];

const activityLevels = [
  { value: "beginner", label: "Iniciante" },
  { value: "intermediate", label: "Intermediário" },
  { value: "advanced", label: "Avançado" }
];

const exerciseTypes = [
  { value: "strength", label: "Força" },
  { value: "cardio", label: "Cardio" },
  { value: "mobility", label: "Mobilidade" }
];

const goals = [
  { value: "hypertrophy", label: "Hipertrofia" },
  { value: "endurance", label: "Resistência" },
  { value: "strength", label: "Força" },
  { value: "flexibility", label: "Flexibilidade" },
  { value: "rehabilitation", label: "Reabilitação" }
];

const muscleGroups = [
  { value: "chest", label: "Peito" },
  { value: "back", label: "Costas" },
  { value: "shoulders", label: "Ombros" },
  { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" },
  { value: "legs", label: "Pernas" },
  { value: "core", label: "Core" },
  { value: "full_body", label: "Corpo Inteiro" }
];

export const ExerciseForm = ({ onSubmit, uploading }: ExerciseFormProps) => {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [newExercise, setNewExercise] = useState({
    name: "",
    description: "",
    muscle_group: "chest" as MuscleGroup,
    exercise_type: "strength" as ExerciseType,
    difficulty: "beginner" as Difficulty,
    locations: [] as string[],
    goals: [] as string[],
    activity_level: "beginner"
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

  const handleLocationToggle = (location: string) => {
    setNewExercise(prev => {
      const locations = prev.locations.includes(location)
        ? prev.locations.filter(l => l !== location)
        : [...prev.locations, location];
      return { ...prev, locations };
    });
  };

  const handleGoalToggle = (goal: string) => {
    setNewExercise(prev => {
      const goals = prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal];
      return { ...prev, goals };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(newExercise, selectedFiles[0]);
    setNewExercise({
      name: "",
      description: "",
      muscle_group: "chest",
      exercise_type: "strength",
      difficulty: "beginner",
      locations: [],
      goals: [],
      activity_level: "beginner"
    });
    setSelectedFiles([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Exercício</Label>
              <Input
                id="name"
                value={newExercise.name}
                onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
                required
              />
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
          </CardContent>
        </Card>

        {/* Tipo e Grupo Muscular */}
        <Card>
          <CardHeader>
            <CardTitle>Classificação do Exercício</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  {exerciseTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
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
                  {muscleGroups.map(group => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Nível e Local */}
        <Card>
          <CardHeader>
            <CardTitle>Nível e Local de Treino</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="activity_level">Nível de Atividade Física</Label>
              <Select
                value={newExercise.activity_level}
                onValueChange={(value) => 
                  setNewExercise(prev => ({ ...prev, activity_level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {activityLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Local de Treino</Label>
              <div className="grid grid-cols-2 gap-4">
                {trainingLocations.map(location => (
                  <div key={location.value} className="flex items-center space-x-2">
                    <Switch
                      id={`location-${location.value}`}
                      checked={newExercise.locations.includes(location.value)}
                      onCheckedChange={() => handleLocationToggle(location.value)}
                    />
                    <Label htmlFor={`location-${location.value}`}>{location.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Objetivos */}
        <Card>
          <CardHeader>
            <CardTitle>Objetivos do Exercício</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {goals.map(goal => (
                <div key={goal.value} className="flex items-center space-x-2">
                  <Switch
                    id={`goal-${goal.value}`}
                    checked={newExercise.goals.includes(goal.value)}
                    onCheckedChange={() => handleGoalToggle(goal.value)}
                  />
                  <Label htmlFor={`goal-${goal.value}`}>{goal.label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload do GIF */}
      <Card>
        <CardHeader>
          <CardTitle>GIF do Exercício</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Button type="submit" disabled={uploading} className="w-full">
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
