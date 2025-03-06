
import { AgentPromptsList } from "@/components/admin/ai-agents/AgentPromptsList";
import { NutriPlusPromptManager } from "@/components/admin/ai-agents/NutriPlusPromptManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AIAgentsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">Agentes de IA</h1>
      
      <Tabs defaultValue="nutri-plus">
        <TabsList className="mb-6">
          <TabsTrigger value="nutri-plus">Nutri+</TabsTrigger>
          <TabsTrigger value="prompts-list">Todos os Prompts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nutri-plus">
          <NutriPlusPromptManager />
        </TabsContent>
        
        <TabsContent value="prompts-list">
          <AgentPromptsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
