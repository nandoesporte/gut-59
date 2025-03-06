
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AgentPromptForm } from "./AgentPromptForm";
import { AIAgentPrompt } from "./types";

const DEFAULT_PROMPT = `Você é um nutricionista virtual especializado na criação de cardápios personalizados. Seu objetivo é gerar um plano alimentar detalhado e equilibrado para 7 dias baseado no objetivo, nas calorias diárias e nas preferências alimentares do usuário.

Fluxo de Geração do Cardápio
Receba os dados do usuário:

Objetivo: {USER_GOAL} 
Calorias diárias recomendadas: {USER_DAILY_CALORIES} kcal
Preferências alimentares: Lista de alimentos selecionados pelo usuário
Restrições alimentares: {USER_RESTRICTIONS}
Alergias: {USER_ALLERGIES}
Horário de treino: {USER_TRAINING_TIME}

Criação do Cardápio:
- Distribua as calorias ao longo do dia (café da manhã, lanche da manhã, almoço, lanche da tarde, jantar e ceia, se necessário).
- Escolha alimentos das preferências do usuário para cada refeição, utilizando apenas os alimentos disponíveis na lista fornecida.
- Mantenha um equilíbrio nutricional, garantindo boas fontes de proteínas, carboidratos e gorduras saudáveis.
- Ajuste porções para alcançar as calorias diárias recomendadas.
- Evite repetições excessivas de pratos, garantindo variedade ao longo da semana.
- Inclua sugestões de temperos e formas de preparo saudáveis.

Alimentos disponíveis por refeição:
{FOODS_BY_MEAL}

Formato de Saída: JSON estruturado que será processado pela aplicação
Linguagem: Português
Estilo: Profissional e claro

O JSON deve seguir exatamente a estrutura abaixo:

{
  "weeklyPlan": {
    "monday": {
      "dayName": "Segunda-feira",
      "meals": {
        "breakfast": {
          "description": "Descrição do café da manhã",
          "foods": [
            {
              "name": "Nome do alimento",
              "portion": 100,
              "unit": "g",
              "details": "Detalhes sobre o preparo"
            }
          ],
          "calories": 500,
          "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
        },
        "morningSnack": {},
        "lunch": {},
        "afternoonSnack": {},
        "dinner": {}
      },
      "dailyTotals": {"calories": 2000, "protein": 120, "carbs": 180, "fats": 60, "fiber": 25}
    },
    "tuesday": {},
    "wednesday": {},
    "thursday": {},
    "friday": {},
    "saturday": {},
    "sunday": {}
  },
  "weeklyTotals": {
    "averageCalories": 2000,
    "averageProtein": 120,
    "averageCarbs": 180,
    "averageFats": 60,
    "averageFiber": 25
  }
}

É fundamental que sua resposta seja APENAS o objeto JSON válido, sem explicações ou texto adicional, pois isso interferirá no processamento do plano alimentar pela aplicação.`;

export const NutriPlusPromptManager = () => {
  const [prompt, setPrompt] = useState<AIAgentPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchActivePrompt();
  }, []);

  const fetchActivePrompt = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_agent_prompts')
        .select('*')
        .eq('agent_type', 'meal_plan')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('Erro ao buscar prompt ativo:', error);
        return;
      }
      
      setPrompt(data);
    } catch (error) {
      console.error('Erro ao processar busca de prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPrompt = async () => {
    try {
      setLoading(true);
      
      // Verificar se já existe algum prompt de meal_plan
      const { data: existingPrompts } = await supabase
        .from('ai_agent_prompts')
        .select('id')
        .eq('agent_type', 'meal_plan');
        
      // Se existir algum prompt, desativar todos
      if (existingPrompts && existingPrompts.length > 0) {
        await supabase
          .from('ai_agent_prompts')
          .update({ is_active: false })
          .eq('agent_type', 'meal_plan');
      }
      
      // Criar novo prompt padrão
      const { data, error } = await supabase
        .from('ai_agent_prompts')
        .insert({
          agent_type: 'meal_plan',
          name: 'Prompt Padrão Nutri+',
          description: 'Prompt otimizado para geração de planos alimentares personalizados.',
          prompt: DEFAULT_PROMPT,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      setPrompt(data);
      toast.success('Prompt padrão criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar prompt padrão:', error);
      toast.error('Erro ao criar prompt padrão');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setIsEditing(false);
    fetchActivePrompt();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configuração do Agente Nutri+</CardTitle>
        <CardDescription>
          Gerencie o prompt que será usado para gerar planos alimentares personalizados
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4 text-center">Carregando configurações...</div>
        ) : isEditing ? (
          <div className="space-y-4">
            <AgentPromptForm 
              type="meal_plan" 
              prompt={prompt || undefined} 
              onSuccess={handleSuccess} 
            />
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          </div>
        ) : prompt ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">{prompt.name}</h3>
              {prompt.description && (
                <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>
              )}
            </div>
            <Textarea
              value={prompt.prompt}
              className="font-mono text-xs min-h-[300px]"
              readOnly
            />
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="default" onClick={() => setIsEditing(true)}>
                Editar Prompt
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <p className="text-center">
              Nenhum prompt ativo encontrado para o agente Nutri+.
            </p>
            <div className="flex justify-center">
              <Button onClick={createDefaultPrompt} disabled={loading}>
                Criar Prompt Padrão
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
