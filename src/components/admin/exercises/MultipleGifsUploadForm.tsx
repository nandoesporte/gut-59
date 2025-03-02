
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExerciseType, Difficulty, Exercise } from "./types";
import { Progress } from "@/components/ui/progress";

interface MultipleGifsUploadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const MultipleGifsUploadForm = ({
  onSuccess,
  onCancel,
}: MultipleGifsUploadFormProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [exerciseType, setExerciseType] = useState<ExerciseType>("strength");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [muscleGroup, setMuscleGroup] = useState("chest");
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  const muscleGroupOptions = [
    { value: "chest", label: "Peitoral" },
    { value: "back", label: "Costas" },
    { value: "legs", label: "Pernas" },
    { value: "shoulders", label: "Ombros" },
    { value: "arms", label: "Braços" },
    { value: "core", label: "Core" },
    { value: "full_body", label: "Corpo Inteiro" },
    { value: "cardio", label: "Cardio" },
  ];

  const validateFile = (file: File): boolean => {
    if (!file.type.includes("gif")) {
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
    setSelectedFiles((prev) => [...prev, ...validFiles]);
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecione pelo menos um arquivo para fazer upload");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const totalFiles = selectedFiles.length;
      let completedFiles = 0;

      for (const file of selectedFiles) {
        // Extract exercise name from filename (removing extension)
        const exerciseName = file.name.replace(".gif", "").replace(/_/g, " ");

        // Upload the GIF file
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("exercise-gifs")
          .upload(`batch/${crypto.randomUUID()}.gif`, file);

        if (uploadError) throw uploadError;

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from("exercise-gifs")
          .getPublicUrl(uploadData.path);

        // Create the exercise record with required fields
        // Ensure all required fields are explicitly set (not optional)
        const exerciseData = {
          name: exerciseName,
          description: `Exercício de ${muscleGroupOptions.find(m => m.value === muscleGroup)?.label}`,
          gif_url: publicUrl,
          exercise_type: exerciseType,
          difficulty: difficulty,
          muscle_group: muscleGroup as any,
          primary_muscles_worked: [muscleGroup],
          goals: ["fitness"],
          equipment_needed: [],
          is_compound_movement: false,
          // Default required fields for the exercises table
          max_reps: 12,
          min_reps: 8, 
          max_sets: 5,
          min_sets: 3,
          rest_time_seconds: 60
        };

        const { error: insertError } = await supabase
          .from("exercises")
          .insert(exerciseData);

        if (insertError) throw insertError;

        completedFiles++;
        setUploadProgress(Math.floor((completedFiles / totalFiles) * 100));
      }

      toast.success("Todos os GIFs foram enviados com sucesso!");
      setSelectedFiles([]);
      onSuccess();
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao fazer upload dos arquivos. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Múltiplo de GIFs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <SelectItem value="strength">Força</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="mobility">Mobilidade</SelectItem>
                  <SelectItem value="flexibility">Flexibilidade</SelectItem>
                  <SelectItem value="balance">Equilíbrio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Dificuldade</Label>
              <Select
                value={difficulty}
                onValueChange={(value: Difficulty) => setDifficulty(value)}
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

            <div>
              <Label>Grupo Muscular</Label>
              <Select
                value={muscleGroup}
                onValueChange={setMuscleGroup}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo muscular" />
                </SelectTrigger>
                <SelectContent>
                  {muscleGroupOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <p className="text-sm text-muted-foreground mt-1">
              Selecione múltiplos arquivos GIF (máx. 20MB cada). Os nomes dos arquivos serão usados como nomes dos exercícios.
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Arquivos Selecionados ({selectedFiles.length})</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
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
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Processando arquivos... {uploadProgress}%
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleUploadAll}
              disabled={uploading || selectedFiles.length === 0}
              className="flex-1"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Enviando..." : "Enviar Todos"}
            </Button>
            <Button 
              variant="outline" 
              onClick={onCancel}
              disabled={uploading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
