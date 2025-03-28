
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Upload, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExerciseType, Difficulty, Exercise, MuscleGroup } from "./types";
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
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>("chest");
  const [trainingLocation, setTrainingLocation] = useState("gym");
  const [goal, setGoal] = useState<string>("weight_loss");
  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  const muscleGroupOptions = [
    { value: "chest" as MuscleGroup, label: "Peitoral" },
    { value: "back" as MuscleGroup, label: "Costas" },
    { value: "legs" as MuscleGroup, label: "Pernas" },
    { value: "shoulders" as MuscleGroup, label: "Ombros" },
    { value: "arms" as MuscleGroup, label: "Braços" },
    { value: "core" as MuscleGroup, label: "Core" },
    { value: "full_body" as MuscleGroup, label: "Corpo Inteiro" },
    { value: "cardio" as MuscleGroup, label: "Cardio" },
  ];
  
  const locationOptions = [
    { value: "gym", label: "Academia" },
    { value: "home", label: "Casa" },
    { value: "outdoor", label: "Ar Livre" },
    { value: "anywhere", label: "Qualquer Lugar" },
  ];
  
  const goalOptions = [
    { value: "weight_loss", label: "Perder Peso - Foco em queima de gordura" },
    { value: "maintenance", label: "Manter Peso - Melhorar condicionamento" },
    { value: "muscle_gain", label: "Ganhar Massa - Foco em hipertrofia" },
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
      let successCount = 0;
      let errorCount = 0;

      for (const file of selectedFiles) {
        try {
          const exerciseName = file.name.replace(".gif", "").replace(/_/g, " ");

          // Create a unique filename with timestamp to avoid caching issues
          const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          const filePath = `batch/${uniqueId}_${file.name.replace(/\s+/g, "_")}`;

          console.log(`Uploading file: ${filePath}`);

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("exercise-gifs")
            .upload(filePath, file, {
              cacheControl: "no-cache, max-age=0",
              upsert: true
            });

          if (uploadError) {
            console.error(`Upload error for ${file.name}:`, uploadError);
            errorCount++;
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from("exercise-gifs")
            .getPublicUrl(uploadData.path);

          console.log(`File uploaded successfully. Public URL: ${publicUrl}`);

          const validExerciseType = exerciseType === "strength" || 
                                 exerciseType === "cardio" || 
                                 exerciseType === "mobility" 
                                 ? exerciseType 
                                 : "mobility";
          
          // Use a default difficulty value since we removed the selector
          const defaultDifficulty: Difficulty = "beginner";

          const exerciseData = {
            name: exerciseName,
            description: `Exercício de ${muscleGroupOptions.find(m => m.value === muscleGroup)?.label}`,
            gif_url: publicUrl,
            exercise_type: validExerciseType,
            difficulty: defaultDifficulty,
            muscle_group: muscleGroup,
            primary_muscles_worked: [muscleGroup],
            goals: [goal],
            equipment_needed: [],
            is_compound_movement: false,
            max_reps: 12,
            min_reps: 8, 
            max_sets: 5,
            min_sets: 3,
            rest_time_seconds: 60
          };

          console.log("Inserting exercise data:", exerciseData);

          const { error: insertError } = await supabase
            .from("exercises")
            .insert(exerciseData);

          if (insertError) {
            console.error(`Database error for ${file.name}:`, insertError);
            errorCount++;
            throw insertError;
          }

          successCount++;
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          // Continue with the next file
        } finally {
          completedFiles++;
          setUploadProgress(Math.floor((completedFiles / totalFiles) * 100));
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} GIFs foram enviados com sucesso!`);
        if (errorCount > 0) {
          toast.error(`${errorCount} GIFs não puderam ser processados.`);
        }
        setSelectedFiles([]);
        onSuccess();
      } else {
        toast.error("Nenhum GIF foi enviado com sucesso. Verifique os erros no console.");
      }
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
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Grupo Muscular</Label>
              <Select
                value={muscleGroup}
                onValueChange={(value: MuscleGroup) => setMuscleGroup(value)}
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
            
            <div>
              <Label>Local de Treino</Label>
              <Select
                value={trainingLocation}
                onValueChange={setTrainingLocation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local de treino" />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label>Objetivo</Label>
            <Select
              value={goal}
              onValueChange={setGoal}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o objetivo" />
              </SelectTrigger>
              <SelectContent>
                {goalOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {uploading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar Todos
                </>
              )}
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
