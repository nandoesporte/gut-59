
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AIModelSettings = () => {
  const [loading, setLoading] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    activeModel: 'llama3',
    systemPrompt: '',
    useCustomPrompt: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_model_settings')
        .select('*')
        .eq('name', 'trene2025')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setAiSettings({
          activeModel: data.active_model || 'llama3',
          systemPrompt: data.system_prompt || getDefaultPrompt(),
          useCustomPrompt: data.use_custom_prompt || false
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações de IA');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPrompt = () => {
    return `Você é TRENE2025, um agente de IA especializado em educação física e nutrição esportiva. 
Seu objetivo é criar planos de treino detalhados, personalizados e cientificamente embasados.
Você deve fornecer um plano completo, com exercícios, séries, repetições e dicas específicas.`;
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('ai_model_settings')
        .upsert({
          name: 'trene2025',
          active_model: aiSettings.activeModel,
          system_prompt: aiSettings.systemPrompt,
          use_custom_prompt: aiSettings.useCustomPrompt,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações de IA');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAiSettings({
      ...aiSettings,
      systemPrompt: getDefaultPrompt()
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Modelo de IA - TRENE2025</CardTitle>
        <CardDescription>
          Configure as opções para o modelo de IA usado para gerar planos de treino
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="model-select">Modelo de IA Ativo</Label>
          <Select
            value={aiSettings.activeModel}
            onValueChange={(value) => setAiSettings({...aiSettings, activeModel: value})}
            disabled={loading}
          >
            <SelectTrigger id="model-select">
              <SelectValue placeholder="Selecione o modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="llama3">Llama 3 (8B)</SelectItem>
              <SelectItem value="groq">Groq</SelectItem>
              <SelectItem value="gpt4">GPT-4</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="use-custom-prompt"
            checked={aiSettings.useCustomPrompt}
            onCheckedChange={(checked) => setAiSettings({...aiSettings, useCustomPrompt: checked})}
            disabled={loading}
          />
          <Label htmlFor="use-custom-prompt">Usar prompt personalizado</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="system-prompt">Prompt do Sistema</Label>
          <Textarea
            id="system-prompt"
            value={aiSettings.systemPrompt}
            onChange={(e) => setAiSettings({...aiSettings, systemPrompt: e.target.value})}
            disabled={loading}
            className="min-h-[200px]"
            placeholder="Insira o prompt do sistema para o modelo de IA"
          />
          <p className="text-sm text-muted-foreground">
            {aiSettings.useCustomPrompt 
              ? "Este prompt personalizado será usado para instruir o modelo de IA" 
              : "Este prompt será usado apenas se a opção 'Usar prompt personalizado' estiver ativada"}
          </p>
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={loading}
          >
            Restaurar Padrão
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
          >
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
