
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleForm } from "./training/ModuleForm";
import { VideoForm } from "./training/VideoForm";
import { ExerciseGifsTab } from "./ExerciseGifsTab";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TrainingTab = () => {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      toast.error('Erro ao carregar módulos');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Tabs defaultValue="modules">
      <TabsList>
        <TabsTrigger value="modules">Módulos</TabsTrigger>
        <TabsTrigger value="videos">Vídeos</TabsTrigger>
        <TabsTrigger value="exercise-gifs">GIFs de Exercícios</TabsTrigger>
      </TabsList>
      <TabsContent value="modules">
        <ModuleForm onModuleChange={fetchModules} />
      </TabsContent>
      <TabsContent value="videos">
        <VideoForm modules={modules} />
      </TabsContent>
      <TabsContent value="exercise-gifs">
        <ExerciseGifsTab />
      </TabsContent>
    </Tabs>
  );
};
