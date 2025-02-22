import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Exercise, MuscleGroup, ExerciseType, Difficulty } from "./types";
import { categories } from "./categoryOptions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface BatchUploadFormProps {
  onUpload: (exerciseData: Omit<Exercise, 'id' | 'gif_url'>, file?: File) => Promise<void>;
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

export const BatchUploadForm = ({
  onUpload,
  uploading,
}: BatchUploadFormProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [exerciseType, setExerciseType] = useState<ExerciseType>("strength");
  const [selectedCategory, setSelectedCategory] = useState<MuscleGroup>("chest");
  const [activityLevel, setActivityLevel] = useState<Difficulty>("beginner");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB por arquivo

  const validateFile = (file: File): boolean => {
    if (!file.type.includes('gif')) {
      toast.error(`${file.name} não é um arquivo GIF`);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} é muito grande. O tamanho máximo é 20MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(validateFile);
    setSelectedFiles(prev => [...prev, ...validFiles]);
    event.target.value = ''; // Reset input
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationToggle = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  const handleGoalToggle = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos um arquivo para fazer upload');
      return;
    }

    try {
      for (const file of selectedFiles) {
        const exerciseData = {
          name: file.name.replace('.gif', ''),
          description: '',
          muscle_group: selectedCategory,
          exercise_type: exerciseType,
          difficulty: activityLevel,
          equipment_needed: selectedLocations,
          alternative_exercises: [],
          max_reps: 12,
          min_reps: 8,
          max_sets: 4,
          min_sets: 3,
          rest_time_seconds: 60
        };
        
        await onUpload(exerciseData, file);
      }
      setSelectedFiles([]);
      toast.success('Todos os arquivos foram enviados com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload dos arquivos. Tente novamente.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload em Lote</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Exercício</Label>
              <Select
                value={exerciseType}
                onValueChange={(value: ExerciseType) => setExerciseType(value)}
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
              <Label>Grupo Muscular</Label>
              <Select
                value={selectedCategory}
                onValueChange={(value: MuscleGroup) => setSelectedCategory(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
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
          </div>

          <div>
            <Label>Nível de Atividade Física</Label>
            <Select
              value={activityLevel}
              onValueChange={setActivityLevel}
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
                    id={`batch-location-${location.value}`}
                    checked={selectedLocations.includes(location.value)}
                    onCheckedChange={() => handleLocationToggle(location.value)}
                  />
                  <Label htmlFor={`batch-location-${location.value}`}>{location.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Objetivos dos Exercícios</Label>
            <div className="grid grid-cols-2 gap-4">
              {goals.map(goal => (
                <div key={goal.value} className="flex items-center space-x-2">
                  <Switch
                    id={`batch-goal-${goal.value}`}
                    checked={selectedGoals.includes(goal.value)}
                    onCheckedChange={() => handleGoalToggle(goal.value)}
                  />
                  <Label htmlFor={`batch-goal-${goal.value}`}>{goal.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="files">Selecionar GIFs</Label>
            <Input
              id="files"
              type="file"
              accept=".gif"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Selecione múltiplos arquivos GIF (máx. 20MB cada). Os nomes dos arquivos serão usados como nomes dos exercícios.
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Arquivos Selecionados ({selectedFiles.length})</Label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <span className="truncate flex-1">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleUploadAll}
                disabled={uploading}
                className="w-full mt-2"
              >
                {uploading ? 'Enviando...' : 'Enviar Todos'}
              </Button>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <Progress value={100} className="w-full" />
              <p className="text-sm text-center text-gray-500">
                Processando arquivos... Por favor, aguarde.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
