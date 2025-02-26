
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleForm } from "./ModuleForm";
import { VideoForm } from "./VideoForm";
import { MentalHealthPrompts } from "./MentalHealthPrompts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MentalModule } from "./types";

interface MentalHealthSettings {
  id: string;
  breathing_exercise_daily_limit: number;
  created_at: string;
  updated_at: string;
}

export const MentalHealthTab = () => {
  const [modules, setModules] = useState<MentalModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<MentalHealthSettings | null>(null);
  const [newLimit, setNewLimit] = useState<number>(5);

  useEffect(() => {
    fetchModules();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('mental_health_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data as MentalHealthSettings);
      setNewLimit(data.breathing_exercise_daily_limit);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    }
  };

  const updateBreathingLimit = async () => {
    try {
      const { error } = await supabase
        .from('mental_health_settings')
        .update({ breathing_exercise_daily_limit: newLimit })
        .eq('id', settings?.id);

      if (error) throw error;
      toast.success('Limite atualizado com sucesso');
      fetchSettings();
    } catch (error) {
      console.error('Error updating limit:', error);
      toast.error('Erro ao atualizar limite');
    }
  };

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
        <TabsTrigger value="prompts">Prompts IA</TabsTrigger>
        <TabsTrigger value="settings">Configurações</TabsTrigger>
      </TabsList>
      
      <TabsContent value="modules">
        <ModuleForm onModuleChange={fetchModules} />
      </TabsContent>
      
      <TabsContent value="videos">
        <VideoForm modules={modules} />
      </TabsContent>
      
      <TabsContent value="prompts">
        <MentalHealthPrompts />
      </TabsContent>

      <TabsContent value="settings">
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Exercícios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="breathingLimit" className="text-sm font-medium">
                Limite Diário de Exercícios de Respiração
              </label>
              <div className="flex space-x-2">
                <Input
                  id="breathingLimit"
                  type="number"
                  min="1"
                  value={newLimit}
                  onChange={(e) => setNewLimit(Number(e.target.value))}
                  className="max-w-[200px]"
                />
                <Button onClick={updateBreathingLimit}>
                  Salvar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Quantidade máxima de exercícios de respiração que um usuário pode fazer por dia para ganhar recompensas.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
