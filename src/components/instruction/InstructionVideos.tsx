
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrainingModule, TrainingVideo } from "@/components/admin/types";
import { Card } from "@/components/ui/card";
import { Play, Video } from "lucide-react";
import { useState } from "react";

export const InstructionVideos = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const { data: modules, isLoading: isLoadingModules } = useQuery({
    queryKey: ['training-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .eq('status', 'active')
        .order('display_order');
      if (error) throw error;
      return data as TrainingModule[];
    },
  });

  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['training-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_videos')
        .select('*')
        .eq('status', 'active')
        .order('created_at');
      if (error) throw error;
      return data as TrainingVideo[];
    },
  });

  if (isLoadingModules || isLoadingVideos) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!modules?.length || !videos?.length) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">
          Nenhum vídeo de instrução disponível no momento.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-primary-700 text-center">
        Vídeos de Instrução
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules?.map((module) => {
          const moduleVideos = videos?.filter(
            (video) => video.module_id === module.id
          );

          if (!moduleVideos.length) return null;

          return moduleVideos.map((video) => (
            <Card 
              key={video.id} 
              className="group overflow-hidden transition-all duration-300 hover:shadow-xl"
            >
              {activeVideo === video.id ? (
                <div className="aspect-video">
                  <iframe
                    src={video.url}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div 
                  className="aspect-video bg-gradient-to-br from-primary-100 to-primary-50 relative cursor-pointer"
                  onClick={() => setActiveVideo(video.id)}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                    <div className="w-16 h-16 rounded-full bg-primary-500/90 flex items-center justify-center text-white group-hover:bg-primary-600 transition-colors">
                      <Play className="w-8 h-8 ml-1" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-800 mb-1">{video.title}</p>
                      <p className="text-sm text-gray-600">{module.name}</p>
                    </div>
                  </div>
                </div>
              )}
              {video.description && !activeVideo && (
                <div className="p-4 border-t">
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {video.description}
                  </p>
                </div>
              )}
            </Card>
          ));
        })}
      </div>
    </div>
  );
};
