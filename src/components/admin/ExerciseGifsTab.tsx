
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { UploadCloud, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type MuscleGroup = "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "full_body" | "cardio" | "mobility";
type ExerciseType = "strength" | "cardio" | "mobility";
type Difficulty = "beginner" | "intermediate" | "advanced";

interface Exercise {
  id: string;
  description: string | null;
  gif_url: string | null;
  muscle_group: MuscleGroup;
  exercise_type: ExerciseType;
  difficulty: Difficulty;
}

interface FileWithPreview extends File {
  preview?: string;
}

export const ExerciseGifsTab = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [newExercise, setNewExercise] = useState({
    name: "",
    description: "",
    muscle_group: "chest" as MuscleGroup,
    exercise_type: "strength" as ExerciseType,
    difficulty: "beginner" as Difficulty
  });

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      toast.error('Erro ao carregar exercícios');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File) => {
    if (!file.type.includes('gif')) {
      toast.error(`${file.name} não é um arquivo GIF`);
      return false;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`${file.name} excede o tamanho máximo de 5MB`);
      return false;
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

    if (!newExercise.name) {
      toast.error('Nome do exercício é obrigatório');
      return;
    }

    try {
      setUploading(true);

      // Criar o exercício primeiro
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercises')
        .insert({
          name: newExercise.name,
          description: newExercise.description || null,
          muscle_group: newExercise.muscle_group,
          exercise_type: newExercise.exercise_type,
          difficulty: newExercise.difficulty,
          min_reps: 8, // valores padrão
          max_reps: 12,
          min_sets: 3,
          max_sets: 5,
          rest_time_seconds: 60
        })
        .select()
        .single();

      if (exerciseError) throw exerciseError;

      // Se houver arquivo selecionado, fazer upload
      if (selectedFiles.length > 0) {
        const file = selectedFiles[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${exerciseData.id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('exercise-gifs')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('exercise-gifs')
          .getPublicUrl(fileName);

        // Atualizar o exercício com a URL do GIF
        const { error: updateError } = await supabase
          .from('exercises')
          .update({ gif_url: publicUrl })
          .eq('id', exerciseData.id);

        if (updateError) throw updateError;
      }

      toast.success('Exercício criado com sucesso!');
      setNewExercise({
        name: "",
        description: "",
        muscle_group: "chest",
        exercise_type: "strength",
        difficulty: "beginner"
      });
      setSelectedFiles([]);
      fetchExercises();
    } catch (error) {
      toast.error('Erro ao criar exercício');
      console.error('Error:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeGif = async (exerciseId: string, fileName: string) => {
    try {
      const { error: deleteError } = await supabase.storage
        .from('exercise-gifs')
        .remove([fileName]);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('exercises')
        .update({ gif_url: null })
        .eq('id', exerciseId);

      if (updateError) throw updateError;

      toast.success('GIF removido com sucesso!');
      fetchExercises();
    } catch (error) {
      toast.error('Erro ao remover GIF');
      console.error('Error:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Exercício</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <SelectItem value="chest">Peito</SelectItem>
                    <SelectItem value="back">Costas</SelectItem>
                    <SelectItem value="legs">Pernas</SelectItem>
                    <SelectItem value="shoulders">Ombros</SelectItem>
                    <SelectItem value="arms">Braços</SelectItem>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="full_body">Corpo Inteiro</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="mobility">Mobilidade</SelectItem>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exercícios Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="border p-4 rounded-lg">
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
                            if (fileName) removeGif(exercise.id, fileName);
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
