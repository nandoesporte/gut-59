
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MentalModule, MentalVideo } from "../admin/mental/types";
import { Play, Info } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export const MentalModules = () => {
  const [modules, setModules] = useState<MentalModule[]>([]);
  const [videos, setVideos] = useState<MentalVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<MentalVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const getVideoPreview = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return null;
  };

  const getThumbnailUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    return null;
  };

  const handleVideoSelect = (video: MentalVideo) => {
    setSelectedVideo(video);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  // If no modules or videos are available
  if (!isLoading && modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-gray-50 rounded-lg">
        <Info className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-xl font-medium text-center">Nenhum recurso disponível</h3>
        <p className="text-muted-foreground text-center">
          Novos conteúdos de saúde mental serão adicionados em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {selectedVideo ? (
            <div className="space-y-4">
              <button 
                onClick={handleCloseVideo} 
                className="text-primary hover:underline flex items-center gap-2"
              >
                ← Voltar para categorias
              </button>
              
              <Card>
                <CardHeader>
                  <CardTitle>{selectedVideo.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedVideo.description && (
                    <p className="text-muted-foreground">{selectedVideo.description}</p>
                  )}
                  <div className="aspect-video w-full">
                    <iframe
                      src={getVideoPreview(selectedVideo.url)}
                      className="w-full h-full rounded-lg"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold border-b pb-2">Categorias</h3>
              {modules.map((module) => (
                <Card key={module.id} className="overflow-hidden">
                  <CardHeader className="bg-primary/5 pb-3">
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {module.description && (
                      <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
                    )}
                    <div className="grid gap-4">
                      {videos
                        .filter(video => video.module_id === module.id)
                        .slice(0, 3) // Show only first 3 videos per module
                        .map(video => (
                          <div 
                            key={video.id} 
                            className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                            onClick={() => handleVideoSelect(video)}
                          >
                            <div className="w-12 h-12 bg-sky-100 rounded-md flex items-center justify-center flex-shrink-0">
                              <Play className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium line-clamp-1">{video.title}</h4>
                              {video.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{video.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      
                      {videos.filter(video => video.module_id === module.id).length > 3 && (
                        <button className="text-sm text-primary hover:underline self-start mt-2">
                          Ver mais vídeos desta categoria
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
