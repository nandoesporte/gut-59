
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Exercise, MuscleGroup } from "./exercises/types";
import { ExerciseForm } from "./exercises/ExerciseForm";
import { BatchUploadForm } from "./exercises/BatchUploadForm";
import { ExerciseList } from "./exercises/ExerciseList";

export const ExerciseGifsTab = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MuscleGroup>("chest");

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

  const handleSubmit = async (exerciseData: Omit<Exercise, 'id' | 'gif_url'>, file?: File) => {
    try {
      setUploading(true);

      const exercisePayload = {
        ...exerciseData,
        min_reps: 8,
        max_reps: 12,
        min_sets: 3,
        max_sets: 5,
        rest_time_seconds: 60,
        alternative_exercises: [],
        equipment_needed: []
      };

      const { data, error: exerciseError } = await supabase
        .from('exercises')
        .insert(exercisePayload)
        .select()
        .single();

      if (exerciseError) throw exerciseError;

      if (file && data) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${data.id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('exercise-gifs')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('exercise-gifs')
          .getPublicUrl(fileName);

        const { error: updateError } = await supabase
          .from('exercises')
          .update({ gif_url: publicUrl })
          .eq('id', data.id);

        if (updateError) throw updateError;
      }

      toast.success('Exercício criado com sucesso!');
      fetchExercises();
    } catch (error) {
      toast.error('Erro ao criar exercício');
      console.error('Error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleBatchUpload = async (file: File, category: MuscleGroup) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      setUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch('https://sxjafhzikftdenqnkcri.supabase.co/functions/v1/process-exercise-gifs', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar arquivos');
      }

      if (result.errors.length > 0) {
        toast.warning(`Upload concluído com alguns erros: ${result.errors.join(', ')}`);
      } else {
        toast.success('Upload em lote concluído com sucesso!');
      }

      fetchExercises();
    } catch (error) {
      toast.error('Erro ao fazer upload em lote');
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Individual</CardTitle>
              </CardHeader>
              <CardContent>
                <ExerciseForm onSubmit={handleSubmit} uploading={uploading} />
              </CardContent>
            </Card>

            <BatchUploadForm
              onUpload={handleBatchUpload}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              uploading={uploading}
            />
          </div>
        </CardContent>
      </Card>

      <ExerciseList exercises={exercises} onRemoveGif={removeGif} />
    </div>
  );
};

