
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleForm } from "./training/ModuleForm";
import { VideoForm } from "./training/VideoForm";
import { ExerciseGifsTab } from "./ExerciseGifsTab";

export const TrainingTab = () => {
  return (
    <Tabs defaultValue="modules">
      <TabsList>
        <TabsTrigger value="modules">Módulos</TabsTrigger>
        <TabsTrigger value="videos">Vídeos</TabsTrigger>
        <TabsTrigger value="exercise-gifs">GIFs de Exercícios</TabsTrigger>
      </TabsList>
      <TabsContent value="modules">
        <ModuleForm />
      </TabsContent>
      <TabsContent value="videos">
        <VideoForm />
      </TabsContent>
      <TabsContent value="exercise-gifs">
        <ExerciseGifsTab />
      </TabsContent>
    </Tabs>
  );
};
