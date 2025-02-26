
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Play } from "lucide-react";
import type { MentalModule, MentalVideo } from "@/components/admin/mental/types";

export const MentalHealthResources = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const { data: modules, isLoading: isLoadingModules } = useQuery({
    queryKey: ['mental-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mental_modules')
        .select('*')
        .eq('status', 'active')
        .order('display_order');
      if (error) throw error;
      return data as MentalModule[];
    },
  });

  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['mental-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mental_videos')
        .select(`
          *,
          mental_modules (
            name
          )
        `)
        .eq('status', 'active')
        .order('created_at');
      if (error) throw error;
      return data as MentalVideo[];
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
          Nenhum conteúdo de saúde mental disponível no momento.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {modules?.map((module) => {
        const moduleVideos = videos?.filter(
          (video) => video.module_id === module.id
        );

        if (!moduleVideos.length) return null;

        return (
          <div key={module.id} className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">{module.name}</h3>
            {module.description && (
              <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moduleVideos.map((video) => (
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
                      className="aspect-video bg-gradient-to-br from-[#FEF7CD] to-[#FDF9E6] relative cursor-pointer"
                      onClick={() => setActiveVideo(video.id)}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                        <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center text-white group-hover:bg-primary transition-colors">
                          <Play className="w-8 h-8 ml-1" />
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-gray-800 mb-1">{video.title}</p>
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
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
