
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Video, Pencil, Trash2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrainingModule, TrainingVideo } from "./types";
import { toast } from "sonner";
import { ModuleForm } from "./training/ModuleForm";
import { VideoForm } from "./training/VideoForm";

export const TrainingTab = () => {
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<TrainingModule | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<TrainingVideo | null>(null);
  const queryClient = useQueryClient();

  const { data: modules, isLoading: isLoadingModules } = useQuery({
    queryKey: ['training-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
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
        .order('created_at');
      if (error) throw error;
      return data as TrainingVideo[];
    },
  });

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_modules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] });
      toast.success('Módulo excluído com sucesso');
      setModuleToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting module:', error);
      toast.error('Erro ao excluir módulo');
    },
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_videos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-videos'] });
      toast.success('Vídeo excluído com sucesso');
      setVideoToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting video:', error);
      toast.error('Erro ao excluir vídeo');
    },
  });

  if (isLoadingModules || isLoadingVideos) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestão de Treinamentos</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              Novo Módulo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Módulo</DialogTitle>
            </DialogHeader>
            <ModuleForm
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['training-modules'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Módulos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules?.map((module) => (
                <TableRow key={module.id}>
                  <TableCell>{module.name}</TableCell>
                  <TableCell>{module.display_order}</TableCell>
                  <TableCell>{module.status}</TableCell>
                  <TableCell className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedModule(module)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Módulo</DialogTitle>
                        </DialogHeader>
                        <ModuleForm
                          module={selectedModule}
                          onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['training-modules'] });
                            setSelectedModule(null);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setModuleToDelete(module)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Vídeos</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Video className="w-4 h-4 mr-2" />
              Novo Vídeo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Vídeo</DialogTitle>
            </DialogHeader>
            <VideoForm
              modules={modules || []}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['training-videos'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos?.map((video) => (
                <TableRow key={video.id}>
                  <TableCell>{video.title}</TableCell>
                  <TableCell>
                    {modules?.find((m) => m.id === video.module_id)?.name}
                  </TableCell>
                  <TableCell>{video.status}</TableCell>
                  <TableCell className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedVideo(video)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Vídeo</DialogTitle>
                        </DialogHeader>
                        <VideoForm
                          video={selectedVideo}
                          modules={modules || []}
                          onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['training-videos'] });
                            setSelectedVideo(null);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setVideoToDelete(video)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!moduleToDelete}
        onOpenChange={() => setModuleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este módulo? Esta ação não pode ser desfeita
              e todos os vídeos associados serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => moduleToDelete && deleteModule.mutate(moduleToDelete.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!videoToDelete}
        onOpenChange={() => setVideoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este vídeo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => videoToDelete && deleteVideo.mutate(videoToDelete.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
