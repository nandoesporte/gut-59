
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AgentPromptForm } from "./AgentPromptForm";
import type { AIAgentPrompt } from "./types";
import { Apple, Activity, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

export const AIAgentsTab = () => {
  const [editingPrompt, setEditingPrompt] = useState<AIAgentPrompt | null>(null);
  const [selectedType, setSelectedType] = useState<AIAgentPrompt["agent_type"]>("meal_plan");
  const [promptToDelete, setPromptToDelete] = useState<AIAgentPrompt | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: prompts, refetch } = useQuery({
    queryKey: ['ai-agent-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIAgentPrompt[];
    }
  });

  const handleSuccess = () => {
    setEditingPrompt(null);
    refetch();
  };

  const getPromptsForType = (type: AIAgentPrompt["agent_type"]) => {
    return prompts?.filter(prompt => prompt.agent_type === type) || [];
  };

  const handleEdit = (prompt: AIAgentPrompt) => {
    setEditingPrompt(prompt);
    setSelectedType(prompt.agent_type);
  };

  const handleDeleteClick = (prompt: AIAgentPrompt) => {
    setPromptToDelete(prompt);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!promptToDelete) return;
    
    try {
      const { error } = await supabase
        .from('ai_agent_prompts')
        .delete()
        .eq('id', promptToDelete.id);
        
      if (error) throw error;
      
      toast.success('Agente excluído com sucesso!');
      refetch();
    } catch (error) {
      console.error('Erro ao excluir agente:', error);
      toast.error('Erro ao excluir agente');
    } finally {
      setPromptToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const renderPromptsList = (type: AIAgentPrompt["agent_type"]) => {
    const typePrompts = getPromptsForType(type);

    return (
      <div className="space-y-4">
        {typePrompts.map(prompt => (
          <Card key={prompt.id} className={!prompt.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">{prompt.name}</h4>
                  {prompt.description && (
                    <p className="text-sm text-gray-600">{prompt.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(prompt)}
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteClick(prompt)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <pre className="text-sm bg-gray-50 p-2 rounded mt-2 whitespace-pre-wrap">
                {prompt.prompt}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as AIAgentPrompt["agent_type"])}>
        <TabsList className="mb-4">
          <TabsTrigger value="meal_plan" className="flex items-center gap-2">
            <Apple className="w-4 h-4" />
            Planos Alimentares
          </TabsTrigger>
          <TabsTrigger value="workout" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Treinos Personalizados
          </TabsTrigger>
          <TabsTrigger value="physiotherapy" className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Fisioterapia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meal_plan">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingPrompt?.agent_type === 'meal_plan' ? 'Editar Prompt' : 'Novo Prompt'}
                </h3>
                <AgentPromptForm
                  type="meal_plan"
                  prompt={editingPrompt?.agent_type === 'meal_plan' ? editingPrompt : undefined}
                  onSuccess={handleSuccess}
                />
              </CardContent>
            </Card>
            {renderPromptsList('meal_plan')}
          </div>
        </TabsContent>

        <TabsContent value="workout">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingPrompt?.agent_type === 'workout' ? 'Editar Prompt' : 'Novo Prompt'}
                </h3>
                <AgentPromptForm
                  type="workout"
                  prompt={editingPrompt?.agent_type === 'workout' ? editingPrompt : undefined}
                  onSuccess={handleSuccess}
                />
              </CardContent>
            </Card>
            {renderPromptsList('workout')}
          </div>
        </TabsContent>

        <TabsContent value="physiotherapy">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingPrompt?.agent_type === 'physiotherapy' ? 'Editar Prompt' : 'Novo Prompt'}
                </h3>
                <AgentPromptForm
                  type="physiotherapy"
                  prompt={editingPrompt?.agent_type === 'physiotherapy' ? editingPrompt : undefined}
                  onSuccess={handleSuccess}
                />
              </CardContent>
            </Card>
            {renderPromptsList('physiotherapy')}
          </div>
        </TabsContent>
      </Tabs>

      {editingPrompt && (
        <Button 
          variant="outline" 
          onClick={() => setEditingPrompt(null)}
          className="mt-4"
        >
          Cancelar Edição
        </Button>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Agente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o agente "{promptToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
