import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export const AIModelSettings = () => {
  const [loading, setLoading] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    activeModel: 'grok-3-mini',
    systemPrompt: '',
    useCustomPrompt: false,
    groqApiKey: '',
    xaiApiKey: ''
  });
  const [showMissingKeyAlert, setShowMissingKeyAlert] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

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
        const useGroq = data.active_model === 'groq' || data.active_model === 'llama3';
        const useXAI = data.active_model === 'grok-3-mini';
        
        let apiKeyHasError = false;
        let groqKeyContent = data.groq_api_key || '';
        let xaiKeyContent = data.xai_api_key || '';
        let errorMessage = null;
        
        if (groqKeyContent && (groqKeyContent.includes("Validation") || 
            groqKeyContent.includes("must have required property") ||
            groqKeyContent.includes("Error:"))) {
          apiKeyHasError = true;
          errorMessage = groqKeyContent;
          groqKeyContent = '';
        }
        
        const hasGroqKey = groqKeyContent && groqKeyContent.trim() !== '';
        const hasXAIKey = xaiKeyContent && xaiKeyContent.trim() !== '';
        
        setShowMissingKeyAlert((useGroq && (!hasGroqKey || apiKeyHasError)) || (useXAI && !hasXAIKey));
        setKeyError(apiKeyHasError ? errorMessage : null);
        
        setAiSettings({
          activeModel: data.active_model || 'grok-3-mini',
          systemPrompt: data.system_prompt || getDefaultPrompt(),
          useCustomPrompt: data.use_custom_prompt || false,
          groqApiKey: groqKeyContent,
          xaiApiKey: xaiKeyContent
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
    return `Você é Trenner2025, um agente de IA especializado em educação física e nutrição esportiva. 
Seu objetivo é criar planos de treino detalhados, personalizados e cientificamente embasados.
Você deve fornecer um plano completo, com exercícios, séries, repetições e dicas específicas em português do Brasil.
IMPORTANTE: Todo o conteúdo deve estar SEMPRE em português do Brasil, nunca em inglês.`;
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const useGroq = aiSettings.activeModel === 'groq' || aiSettings.activeModel === 'llama3';
      const useXAI = aiSettings.activeModel === 'grok-3-mini';
      const hasGroqKey = aiSettings.groqApiKey && aiSettings.groqApiKey.trim() !== '';
      const hasXAIKey = aiSettings.xaiApiKey && aiSettings.xaiApiKey.trim() !== '';
      
      if (useGroq && !hasGroqKey) {
        setShowMissingKeyAlert(true);
        toast.warning('Uma chave da API Groq é necessária para utilizar o modelo Llama 3');
      }
      
      if (useXAI && !hasXAIKey) {
        setShowMissingKeyAlert(true);
        toast.warning('Uma chave da API xAI é necessária para utilizar o modelo Grok-3 Mini');
      }
      
      setKeyError(null);
      
      if (hasGroqKey && !aiSettings.groqApiKey.startsWith('gsk_')) {
        toast.warning('A chave da API Groq não parece estar no formato correto (deve começar com "gsk_")');
      }
      
      if (hasXAIKey && !aiSettings.xaiApiKey.startsWith('xai-')) {
        toast.warning('A chave da API xAI não parece estar no formato correto (deve começar com "xai-")');
      }
      
      const { data, error: fetchError } = await supabase
        .from('ai_model_settings')
        .select('id')
        .eq('name', 'trene2025')
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      let saveError;
      
      if (data) {
        const { error } = await supabase
          .from('ai_model_settings')
          .update({
            active_model: aiSettings.activeModel,
            system_prompt: aiSettings.systemPrompt,
            use_custom_prompt: aiSettings.useCustomPrompt,
            groq_api_key: aiSettings.groqApiKey,
            xai_api_key: aiSettings.xaiApiKey,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);
        
        saveError = error;
      } else {
        const { error } = await supabase
          .from('ai_model_settings')
          .insert({
            name: 'trene2025',
            active_model: aiSettings.activeModel,
            system_prompt: aiSettings.systemPrompt,
            use_custom_prompt: aiSettings.useCustomPrompt,
            groq_api_key: aiSettings.groqApiKey,
            xai_api_key: aiSettings.xaiApiKey,
            updated_at: new Date().toISOString()
          });
        
        saveError = error;
      }

      if (saveError) throw saveError;
      
      setShowMissingKeyAlert((useGroq && !hasGroqKey) || (useXAI && !hasXAIKey));
      
      toast.success('Configurações salvas com sucesso');
      fetchSettings();
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
  
  const handleModelChange = (value: string) => {
    const newSettings = {...aiSettings, activeModel: value};
    setAiSettings(newSettings);
    
    const useGroq = value === 'groq' || value === 'llama3';
    const useXAI = value === 'grok-3-mini';
    const hasGroqKey = aiSettings.groqApiKey && aiSettings.groqApiKey.trim() !== '';
    const hasXAIKey = aiSettings.xaiApiKey && aiSettings.xaiApiKey.trim() !== '';
    setShowMissingKeyAlert((useGroq && !hasGroqKey) || (useXAI && !hasXAIKey));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Trenner2025 - Agente de IA</CardTitle>
        <CardDescription>
          Configure as opções para o modelo de IA usado para gerar planos de treino
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showMissingKeyAlert && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {keyError ? (
                <>
                  <p>A chave da API contém erros de validação:</p>
                  <p className="text-xs mt-1 font-mono bg-red-950/30 p-1 rounded">{keyError}</p>
                  <p className="mt-2">Por favor, obtenha uma nova chave válida.</p>
                </>
              ) : (
                <>A chave da API necessária não está configurada. O modelo selecionado não funcionará sem uma chave válida.</>
              )}
            </AlertDescription>
          </Alert>
        )}
      
        <div className="space-y-2">
          <Label htmlFor="model-select">Modelo de IA Ativo</Label>
          <Select
            value={aiSettings.activeModel}
            onValueChange={handleModelChange}
            disabled={loading}
          >
            <SelectTrigger id="model-select">
              <SelectValue placeholder="Selecione o modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grok-3-mini">Grok-3 Mini (xAI)</SelectItem>
              <SelectItem value="llama3">Llama 3 (8B)</SelectItem>
              <SelectItem value="groq">Groq</SelectItem>
              <SelectItem value="gpt4">GPT-4</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="xai-api-key">Chave da API xAI</Label>
          <Input
            id="xai-api-key"
            type="password"
            value={aiSettings.xaiApiKey}
            onChange={(e) => setAiSettings({...aiSettings, xaiApiKey: e.target.value})}
            disabled={loading}
            placeholder="Insira a chave da API xAI"
            className={showMissingKeyAlert && aiSettings.activeModel === 'grok-3-mini' ? "border-red-500 focus:border-red-500" : ""}
          />
          <p className="text-sm text-muted-foreground">
            Necessária para utilizar o modelo Grok-3 Mini
          </p>
          {showMissingKeyAlert && aiSettings.activeModel === 'grok-3-mini' && (
            <div className="text-sm text-red-500 space-y-1">
              <p>
                Obtenha uma chave API em{" "}
                <a 
                  href="https://console.x.ai/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="underline inline-flex items-center"
                >
                  console.x.ai
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </p>
              <p>
                As chaves xAI começam com <code className="bg-red-100 dark:bg-red-900/20 px-1 py-0.5 rounded">xai-</code> seguido por caracteres alfanuméricos
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="groq-api-key">Chave da API Groq</Label>
          <Input
            id="groq-api-key"
            type="password"
            value={aiSettings.groqApiKey}
            onChange={(e) => setAiSettings({...aiSettings, groqApiKey: e.target.value})}
            disabled={loading}
            placeholder="Insira a chave da API Groq"
            className={showMissingKeyAlert && (aiSettings.activeModel === 'groq' || aiSettings.activeModel === 'llama3') ? "border-red-500 focus:border-red-500" : ""}
          />
          <p className="text-sm text-muted-foreground">
            Necessária para utilizar o modelo Llama 3 via Groq
          </p>
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
