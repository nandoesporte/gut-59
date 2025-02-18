
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrainingModule, TrainingVideo } from "@/components/admin/types";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";

export const InstructionVideos = () => {
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
        <Loader2 className="w-8 h-8 animate-spin" />
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
    <Card className="p-6">
      <h2 className="text-2xl font-bold text-primary-700 mb-6">
        Vídeos de Instrução
      </h2>
      <Accordion type="single" collapsible className="space-y-4">
        {modules?.map((module) => {
          const moduleVideos = videos?.filter(
            (video) => video.module_id === module.id
          );

          if (!moduleVideos.length) return null;

          return (
            <AccordionItem
              key={module.id}
              value={module.id}
              className="border rounded-lg p-4"
            >
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                {module.name}
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                {moduleVideos.map((video) => (
                  <div key={video.id} className="space-y-2">
                    <h3 className="font-medium text-gray-900">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-gray-600 text-sm mb-2">
                        {video.description}
                      </p>
                    )}
                    <div className="aspect-video">
                      <iframe
                        src={video.url}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Card>
  );
};
