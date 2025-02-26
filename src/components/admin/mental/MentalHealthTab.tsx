
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleForm } from "./ModuleForm";
import { VideoForm } from "./VideoForm";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MentalModule } from "./types";

export const MentalHealthTab = () => {
  const [modules, setModules] = useState<MentalModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('mental_modules')
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
      </TabsList>
      <TabsContent value="modules">
        <ModuleForm onModuleChange={fetchModules} />
      </TabsContent>
      <TabsContent value="videos">
        <VideoForm modules={modules} />
      </TabsContent>
    </Tabs>
  );
};
