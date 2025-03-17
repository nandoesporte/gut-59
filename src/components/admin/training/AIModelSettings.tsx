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
    activeModel: 'llama3',
    systemPrompt: '',
    useCustomPrompt: false,
    groqApiKey: ''
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
        
        let apiKeyHasError = false;
        let keyContent = data.groq_api_key || '';
        let errorMessage = null;
        
        if (keyContent) {
          if (keyContent.includes("Validation") || 
              keyContent.includes("must have required property") ||
              keyContent.includes("Error:")) {
            apiKeyHasError = true;
            errorMessage = keyContent;
            keyContent = '';
          }
        }
        
        const hasGroqKey = keyContent && keyContent.trim() !== '';
        
        setShowMissingKeyAlert(useGroq && (!hasGroqKey || apiKeyHasError));
        setKeyError(apiKeyHasError ? errorMessage : null);
        
        setAiSettings({
          activeModel: data.active_model || 'llama3',
          systemPrompt: data.system_prompt || getDefaultPrompt(),
          useCustomPrompt: data.use_custom_prompt || false,
          groqApiKey: keyContent
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
      const hasGroqKey = aiSettings.groqApiKey && aiSettings.groqApiKey.trim() !== '';
      
      if (useGroq && !hasGroqKey) {
        setShowMissingKeyAlert(true);
        toast.warning('Uma chave da API Groq é necessária para utilizar o modelo Llama 3');
      }
      
      setKeyError(null);
      
      if (hasGroqKey && !aiSettings.groqApiKey.startsWith('gsk_')) {
        toast.warning('A chave da API Groq não parece estar no formato correto (deve começar com "gsk_")');
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
            updated_at: new Date().toISOString()
          });
        
        saveError = error;
      }

      if (saveError) throw saveError;
      
      setShowMissingKeyAlert(useGroq && !hasGroqKey);
      
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
    const hasGroqKey = aiSettings.groqApiKey && aiSettings.groqApiKey.trim() !== '';
    setShowMissingKeyAlert(useGroq && !hasGroqKey);
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
                  <p>A chave da API Groq contém erros de validação:</p>
                  <p className="text-xs mt-1 font-mono bg-red-950/30 p-1 rounded">{keyError}</p>
                  <p className="mt-2">Por favor, obtenha uma nova chave válida no site da Groq.</p>
                </>
              ) : (
                <>A chave da API Groq não está configurada ou contém erros. Os modelos Llama 3 e Groq não funcionarão sem uma chave válida.</>
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
              <SelectItem value="llama3">Llama 3 (8B)</SelectItem>
              <SelectItem value="groq">Groq</SelectItem>
              <SelectItem value="gpt4">GPT-4</SelectItem>
            </SelectContent>
          </Select>
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
            className={showMissingKeyAlert ? "border-red-500 focus:border-red-500" : ""}
          />
          <p className="text-sm text-muted-foreground">
            Necessária para utilizar o modelo Llama 3 via Groq
          </p>
          {showMissingKeyAlert && (
            <div className="text-sm text-red-500 space-y-1">
              <p>
                Obtenha uma chave API gratuita em{" "}
                <a 
                  href="https://console.groq.com/keys" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="underline inline-flex items-center"
                >
                  console.groq.com/keys
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </p>
              <p>
                As chaves Groq começam com <code className="bg-red-100 dark:bg-red-900/20 px-1 py-0.5 rounded">gsk_</code> seguido por caracteres alfanuméricos
              </p>
            </div>
          )}
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
