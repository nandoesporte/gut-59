
import { useEffect, useState } from "react";
import { AgentPromptForm } from "./AgentPromptForm";
import { AIAgentPrompt } from "./types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Plus, Trash } from "lucide-react";
import { toast } from "sonner";

export const AgentPromptsList = () => {
  const [prompts, setPrompts] = useState<AIAgentPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<AIAgentPrompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState<'all' | AIAgentPrompt['agent_type']>('all');

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_agent_prompts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar prompts:', error);
        toast.error('Erro ao carregar prompts de IA');
        return;
      }
      
      setPrompts((data || []) as AIAgentPrompt[]);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao processar dados dos prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este prompt? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('ai_agent_prompts')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      setPrompts(prompts.filter(prompt => prompt.id !== id));
      toast.success('Prompt excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir prompt:', error);
      toast.error('Erro ao excluir prompt');
    }
  };

  const handleActivate = async (prompt: AIAgentPrompt) => {
    try {
      // Primeiro, desativamos todos os prompts do mesmo tipo
      await supabase
        .from('ai_agent_prompts')
        .update({ is_active: false })
        .eq('agent_type', prompt.agent_type);
        
      // Depois, ativamos o prompt selecionado
      const { error } = await supabase
        .from('ai_agent_prompts')
        .update({ is_active: true })
        .eq('id', prompt.id);
        
      if (error) {
        throw error;
      }
      
      // Atualizar a lista local
      setPrompts(prevPrompts => 
        prevPrompts.map(p => ({
          ...p,
          is_active: p.id === prompt.id ? true : p.agent_type === prompt.agent_type ? false : p.is_active
        }))
      );
      
      toast.success('Prompt ativado com sucesso');
    } catch (error) {
      console.error('Erro ao ativar prompt:', error);
      toast.error('Erro ao ativar prompt');
    }
  };

  const handleSuccess = () => {
    setIsCreating(false);
    setEditingPrompt(null);
    fetchPrompts();
  };

  const getAgentTypeLabel = (type: AIAgentPrompt['agent_type']) => {
    switch (type) {
      case 'meal_plan':
        return 'Plano Alimentar';
      case 'workout':
        return 'Treino';
      case 'physiotherapy':
        return 'Fisioterapia';
      case 'mental_health':
        return 'Saúde Mental';
      default:
        return type;
    }
  };

  const filteredPrompts = selectedAgentType === 'all' 
    ? prompts 
    : prompts.filter(prompt => prompt.agent_type === selectedAgentType);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompts de Agentes IA</CardTitle>
        <CardDescription>
          Gerencie os prompts utilizados pelos agentes de IA
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isCreating ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Novo Prompt</h3>
            <AgentPromptForm 
              type={selectedAgentType === 'all' ? 'meal_plan' : selectedAgentType} 
              onSuccess={handleSuccess} 
            />
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
          </div>
        ) : editingPrompt ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Editar Prompt</h3>
            <AgentPromptForm 
              type={editingPrompt.agent_type} 
              prompt={editingPrompt} 
              onSuccess={handleSuccess} 
            />
            <Button variant="outline" onClick={() => setEditingPrompt(null)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <Tabs 
                value={selectedAgentType} 
                onValueChange={(value) => setSelectedAgentType(value as any)}
                className="w-full sm:w-auto"
              >
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="meal_plan">Nutrição</TabsTrigger>
                  <TabsTrigger value="workout">Treino</TabsTrigger>
                  <TabsTrigger value="physiotherapy">Fisio</TabsTrigger>
                  <TabsTrigger value="mental_health">Mental</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button onClick={() => setIsCreating(true)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Novo Prompt
              </Button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">Carregando prompts...</div>
            ) : filteredPrompts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum prompt encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPrompts.map(prompt => (
                  <Card key={prompt.id} className={`${prompt.is_active ? 'border-primary border-2' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{prompt.name}</CardTitle>
                          <div className="flex gap-2 items-center">
                            <Badge variant="outline">{getAgentTypeLabel(prompt.agent_type)}</Badge>
                            {prompt.is_active && <Badge className="bg-green-500">Ativo</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingPrompt(prompt)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDelete(prompt.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {prompt.description && (
                        <p className="text-sm text-muted-foreground">{prompt.description}</p>
                      )}
                      <div className="mt-2">
                        <div className="max-h-20 overflow-y-auto bg-muted p-2 rounded text-xs font-mono">
                          {prompt.prompt.substring(0, 200)}...
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <div className="text-xs text-muted-foreground">
                          Criado em: {new Date(prompt.created_at || '').toLocaleDateString()}
                        </div>
                        {!prompt.is_active && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleActivate(prompt)}
                          >
                            Ativar este prompt
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
