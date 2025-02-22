
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExerciseForm } from "./exercises/ExerciseForm";
import { BatchUploadForm } from "./exercises/BatchUploadForm";
import { ExerciseList } from "./exercises/ExerciseList";
import { Exercise } from "./exercises/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ExerciseGifsTab = () => {
  const { data: exercises, refetch } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ exerciseData, file }: { exerciseData: Omit<Exercise, 'id' | 'gif_url'>, file?: File }) => {
      if (!file) {
        throw new Error('Arquivo GIF é obrigatório');
      }

      // Upload the GIF file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('exercise-gifs')
        .upload(`${crypto.randomUUID()}.gif`, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('exercise-gifs')
        .getPublicUrl(uploadData.path);

      // Create the exercise record with the additional fields
      const { error: insertError } = await supabase
        .from('exercises')
        .insert({
          ...exerciseData,
          gif_url: publicUrl,
          goals: exerciseData.goals || [], // Ensure goals field is included
          equipment_needed: exerciseData.equipment_needed || [] // Ensure equipment_needed field is included
        });

      if (insertError) throw insertError;

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Exercício salvo com sucesso!');
      refetch();
    },
    onError: (error) => {
      toast.error('Erro ao salvar exercício: ' + error.message);
    }
  });

  const handleSubmit = async (exerciseData: Omit<Exercise, 'id' | 'gif_url'>, file?: File) => {
    await uploadMutation.mutateAsync({ exerciseData, file });
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Upload Individual de Exercício</h2>
      <ExerciseForm
        onSubmit={handleSubmit}
        uploading={uploadMutation.isPending}
      />

      <h2 className="text-2xl font-bold mt-12">Upload em Lote</h2>
      <BatchUploadForm
        onUpload={handleSubmit}
        uploading={uploadMutation.isPending}
      />

      <h2 className="text-2xl font-bold mt-12">Exercícios Cadastrados</h2>
      <ExerciseList exercises={exercises || []} />
    </div>
  );
};
