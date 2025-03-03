
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrainingVideo } from "@/components/admin/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function VideoInstructionDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Check if the user has already seen the instruction video
  useEffect(() => {
    const hasSeenVideo = localStorage.getItem("hasSeenInstructionVideo");
    if (!hasSeenVideo) {
      setOpen(true);
    }
  }, []);

  // Fetch the latest active instruction video
  const { data: video, isLoading } = useQuery({
    queryKey: ["instruction-video"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_videos")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching instruction video:", error);
        return null;
      }
      return data as TrainingVideo;
    },
    enabled: open,
  });

  const handleMarkAsViewed = () => {
    localStorage.setItem("hasSeenInstructionVideo", "true");
    setOpen(false);
    toast.success("Obrigado por assistir ao vídeo de instruções!");
  };

  // If user tries to close without watching
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Prevent closing if localStorage item doesn't exist
      const hasSeenVideo = localStorage.getItem("hasSeenInstructionVideo");
      if (!hasSeenVideo) {
        toast.error("Por favor, assista o vídeo de instruções antes de continuar.");
        return;
      }
    }
    setOpen(newOpen);
  };

  // Redirect to instructions page if no video is available
  useEffect(() => {
    if (!isLoading && !video && open) {
      toast.info("Carregando página de instruções...");
      localStorage.setItem("hasSeenInstructionVideo", "true");
      setOpen(false);
      navigate("/instructions");
    }
  }, [video, isLoading, open, navigate]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {video?.title || "Vídeo de Instruções"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : video ? (
          <div className="aspect-video w-full">
            <iframe
              src={video.url}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-md"
            />
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            Nenhum vídeo de instrução disponível no momento.
          </div>
        )}

        {video && (
          <div className="my-2">
            <p className="text-sm text-gray-600">{video.description}</p>
          </div>
        )}

        <DialogFooter>
          <Button 
            onClick={handleMarkAsViewed} 
            className="w-full sm:w-auto"
            size="lg"
          >
            Visualizado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
