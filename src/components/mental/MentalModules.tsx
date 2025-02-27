import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MentalModule, MentalVideo } from "../admin/mental/types";

export const MentalModules = () => {
  const [modules, setModules] = useState<MentalModule[]>([]);
  const [videos, setVideos] = useState<MentalVideo[]>([]);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data: modulesData, error: modulesError } = await supabase
        .from('mental_modules')
        .select('*')
        .eq('status', 'active')
        .order('display_order');

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      const { data: videosData, error: videosError } = await supabase
        .from('mental_videos')
        .select(`
          *,
          mental_modules (
            name
          )
        `)
        .eq('status', 'active');

      if (videosError) throw videosError;
      setVideos(videosData || []);
    } catch (error) {
      console.error('Error fetching mental health resources:', error);
      toast.error('Erro ao carregar recursos de saúde mental');
    }
  };

  const getVideoPreview = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return null;
  };

  const generateMentalHealthPrompt = async (prompt: string) => {
    const messages = [{ role: "user", content: prompt }];
    
    try {
      const { data, error } = await supabase.functions.invoke('llama-agent', {
        body: { 
          messages: messages,
          systemPrompt: "Você é um assistente especializado em saúde mental. Forneça orientações sobre bem-estar psicológico, técnicas de meditação e estratégias para lidar com estresse e ansiedade. Seja empático e forneça informações baseadas em evidências."
        }
      });
      
      if (error) throw new Error(error.message);
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Erro ao gerar conteúdo de saúde mental:", error);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {modules.map((module) => (
        <Card key={module.id}>
          <CardHeader>
            <CardTitle className="text-lg">{module.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {module.description && (
              <p className="text-sm text-muted-foreground">{module.description}</p>
            )}
            <div className="grid gap-4">
              {videos
                .filter(video => video.module_id === module.id)
                .map(video => (
                  <Card key={video.id} className="p-4">
                    <div className="space-y-4">
                      <h4 className="font-medium">{video.title}</h4>
                      {video.description && (
                        <p className="text-sm text-muted-foreground">{video.description}</p>
                      )}
                      {getVideoPreview(video.url) && (
                        <div className="aspect-video">
                          <iframe
                            src={getVideoPreview(video.url)}
                            className="w-full h-full rounded-lg"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
