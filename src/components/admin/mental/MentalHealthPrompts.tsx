
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AgentPromptForm } from "../ai-agents/AgentPromptForm";
import type { AIAgentPrompt } from "../ai-agents/types";
import { Brain } from "lucide-react";

export const MentalHealthPrompts = () => {
  const [editingPrompt, setEditingPrompt] = useState<AIAgentPrompt | null>(null);

  const { data: prompts, refetch } = useQuery({
    queryKey: ['mental-health-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_prompts')
        .select('*')
        .eq('agent_type', 'mental_health')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIAgentPrompt[];
    }
  });

  const handleSuccess = () => {
    setEditingPrompt(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Prompts de Saúde Mental</h2>
        <Button 
          variant="outline" 
          onClick={() => setEditingPrompt(null)}
          className="gap-2"
        >
          <Brain className="w-4 h-4" />
          Novo Prompt
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <AgentPromptForm
            type="mental_health"
            prompt={editingPrompt}
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {prompts?.map(prompt => (
          <Card key={prompt.id} className={!prompt.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">{prompt.name}</h4>
                  {prompt.description && (
                    <p className="text-sm text-gray-600">{prompt.description}</p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingPrompt(prompt)}
                >
                  Editar
                </Button>
              </div>
              <pre className="text-sm bg-gray-50 p-2 rounded mt-2 whitespace-pre-wrap">
                {prompt.prompt}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
