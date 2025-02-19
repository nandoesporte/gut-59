
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { UploadCloud, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const ExerciseGifsTab = () => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      toast.error('Erro ao carregar exercícios');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (exerciseId: string, file: File) => {
    try {
      setUploading(true);

      // Validar se é um GIF
      if (!file.type.includes('gif')) {
        toast.error('Por favor, envie apenas arquivos GIF');
        return;
      }

      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${exerciseId}.${fileExt}`;

      // Upload do arquivo para o bucket
      const { error: uploadError } = await supabase.storage
        .from('exercise-gifs')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('exercise-gifs')
        .getPublicUrl(fileName);

      // Atualizar URL do GIF no exercício
      const { error: updateError } = await supabase
        .from('exercises')
        .update({ gif_url: publicUrl })
        .eq('id', exerciseId);

      if (updateError) throw updateError;

      toast.success('GIF enviado com sucesso!');
      fetchExercises();
    } catch (error) {
      toast.error('Erro ao enviar GIF');
      console.error('Error:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeGif = async (exerciseId: string, fileName: string) => {
    try {
      // Remover arquivo do storage
      const { error: deleteError } = await supabase.storage
        .from('exercise-gifs')
        .remove([fileName]);

      if (deleteError) throw deleteError;

      // Limpar URL do GIF no exercício
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
          <CardTitle>Gerenciar GIFs dos Exercícios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="border p-4 rounded-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-medium">{exercise.name}</h3>
                    <p className="text-sm text-gray-500">{exercise.muscle_group}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {exercise.gif_url ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={exercise.gif_url}
                          alt={exercise.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            const fileName = exercise.gif_url.split('/').pop();
                            removeGif(exercise.id, fileName);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".gif"
                          className="w-full"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(exercise.id, file);
                            }
                          }}
                          disabled={uploading}
                        />
                        <Button disabled={uploading}>
                          <UploadCloud className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
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
