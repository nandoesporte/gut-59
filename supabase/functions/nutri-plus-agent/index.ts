
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const XAI_API_KEY = Deno.env.get('XAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = await req.json();
    
    console.log('Gerando plano alimentar com Grok-3 Mini para usuário:', userData.id);

    if (!XAI_API_KEY) {
      throw new Error('Chave da API xAI não configurada');
    }

    // Preparar prompt avançado para Grok-3 Mini
    const systemPrompt = `Você é o Dr. NutriMax, um renomado nutricionista clínico e esportivo com mais de 20 anos de experiência, especializado em nutrição de precisão, metabolismo humano e otimização de performance através da alimentação.

Sua missão é criar planos alimentares altamente personalizados usando a metodologia NUTRI-PRECISION™:

## EXPERTISE FUNDAMENTAL
- Especialista em nutrição clínica, esportiva e comportamental
- Profundo conhecimento em metabolismo, bioquímica nutricional e cronobiologia
- Experiência comprovada em mais de 10.000 pacientes atendidos
- Abordagem baseada em evidências científicas e resultados mensuráveis

## METODOLOGIA NUTRI-PRECISION™

### FASE 1: ANÁLISE BIOMÉTRICA PROFUNDA
- Calcular Taxa Metabólica Basal (TMB) com precisão
- Avaliar composição corporal estimada
- Determinar necessidades calóricas individualizadas
- Identificar potenciais deficiências nutricionais

### FASE 2: PERSONALIZAÇÃO ESTRATÉGICA
- Adaptar macronutrientes ao objetivo específico
- Considerar restrições, alergias e preferências alimentares
- Otimizar timing nutricional conforme horário de treino
- Balancear densidade nutricional e palatabilidade

### FASE 3: COMPOSIÇÃO INTELIGENTE
- Selecionar alimentos de alta biodisponibilidade
- Criar combinações sinérgicas para melhor absorção
- Equilibrar índice glicêmico das refeições
- Garantir variedade e sustentabilidade

### FASE 4: OTIMIZAÇÃO DE PERFORMANCE
- Estratégias pré e pós-treino personalizadas
- Hidratação e suplementação quando necessário
- Controle de inflamação através da alimentação
- Suporte à recuperação e adaptação

## PRINCÍPIOS FUNDAMENTAIS
1. **Individualização Total**: Cada plano é único como uma impressão digital
2. **Ciência Aplicada**: Toda recomendação baseada em evidências
3. **Praticidade Real**: Planos viáveis para o dia a dia do paciente
4. **Resultados Mensuráveis**: Objetivos claros e acompanhamento preciso
5. **Educação Nutricional**: Empoderar o paciente com conhecimento

IMPORTANTE: Responda SEMPRE em português do Brasil e retorne APENAS um JSON válido sem formatação markdown, texto adicional ou explicações.`;

    const userPrompt = `
# ANÁLISE NUTRICIONAL COMPLETA

## PERFIL DO PACIENTE
### Dados Antropométricos
- **Peso atual**: ${userData.weight}kg
- **Altura**: ${userData.height}cm (${(userData.height / 100).toFixed(2)}m)
- **IMC estimado**: ${(userData.weight / Math.pow(userData.height / 100, 2)).toFixed(1)}
- **Idade**: ${userData.age} anos
- **Sexo biológico**: ${userData.gender === 'male' ? 'Masculino' : 'Feminino'}

### Estilo de Vida e Objetivos
- **Nível de atividade física**: ${userData.activityLevel}
- **Objetivo principal**: ${userData.goal}
- **Meta calórica diária**: ${userData.dailyCalories}kcal
- **Horário preferencial de treino**: ${dietaryPreferences.trainingTime || 'Flexível / Não especificado'}

### Restrições e Considerações Especiais
- **Restrições alimentares**: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Sem restrições'}
- **Alergias alimentares**: ${dietaryPreferences.hasAllergies ? dietaryPreferences.allergies?.join(', ') : 'Sem alergias conhecidas'}
- **Preferências**: Baseado em alimentos selecionados pelo paciente

### Alimentos Selecionados pelo Paciente
${selectedFoods.map(f => `- ${f.name}`).join('\n')}

---

## SUA MISSÃO
Utilizando a metodologia NUTRI-PRECISION™, crie um plano alimentar semanal EXCEPCIONAL que:

1. **Maximize resultados** em relação ao objetivo do paciente
2. **Respeite todas** as restrições e preferências
3. **Otimize timing nutricional** para performance e recuperação
4. **Equilibre perfeitamente** macronutrientes e micronutrientes
5. **Seja sustentável** e praticável no longo prazo
6. **Eduque através** das escolhas alimentares

### Diretrizes Específicas:
- Distribuir calorias de forma estratégica ao longo do dia
- Priorizar alimentos integrais e minimamente processados
- Criar variedade para garantir amplo espectro de micronutrientes
- Ajustar porções com precisão baseado nas necessidades calóricas
- Incluir estratégias de hidratação e timing de refeições
- Considerar digestibilidade e combinações alimentares
---

## ESTRUTURA DE RESPOSTA OBRIGATÓRIA

Retorne APENAS um JSON válido (sem markdown, sem explicações) com esta estrutura exata:
    {
      "weeklyPlan": {
        "monday": {
          "dayName": "Segunda",
          "meals": {
            "breakfast": {
              "foods": [{"name": "Aveia", "portion": 50, "unit": "g", "details": "com leite"}],
              "calories": 300,
              "macros": {"protein": 15, "carbs": 45, "fats": 8, "fiber": 6}
            },
            "morningSnack": {
              "foods": [{"name": "Banana", "portion": 1, "unit": "unidade"}],
              "calories": 100,
              "macros": {"protein": 1, "carbs": 25, "fats": 0, "fiber": 3}
            },
            "lunch": {
              "foods": [{"name": "Arroz integral", "portion": 100, "unit": "g"}],
              "calories": 400,
              "macros": {"protein": 20, "carbs": 60, "fats": 5, "fiber": 4}
            },
            "afternoonSnack": {
              "foods": [{"name": "Iogurte", "portion": 200, "unit": "ml"}],
              "calories": 150,
              "macros": {"protein": 10, "carbs": 15, "fats": 3, "fiber": 0}
            },
            "dinner": {
              "foods": [{"name": "Frango grelhado", "portion": 150, "unit": "g"}],
              "calories": 350,
              "macros": {"protein": 35, "carbs": 0, "fats": 8, "fiber": 0}
            }
          },
          "dailyTotals": {"calories": 1300, "protein": 81, "carbs": 145, "fats": 24, "fiber": 13}
        },
        "tuesday": {},
        "wednesday": {},
        "thursday": {},
        "friday": {},
        "saturday": {},
        "sunday": {}
      },
      "weeklyTotals": {
        "averageCalories": ${userData.dailyCalories},
        "averageProtein": ${Math.round(userData.dailyCalories * 0.3 / 4)},
        "averageCarbs": ${Math.round(userData.dailyCalories * 0.4 / 4)},
        "averageFats": ${Math.round(userData.dailyCalories * 0.3 / 9)},
        "averageFiber": 25
      },
      "recommendations": {
        "general": "Recomendação geral personalizada baseada no perfil do paciente",
        "preworkout": "Estratégia nutricional pré-treino otimizada",
        "postworkout": "Estratégia nutricional pós-treino para recuperação",
        "hydration": "Protocolo de hidratação personalizado",
        "timing": ["Dica 1 de timing nutricional", "Dica 2 de timing", "Dica 3 de timing"],
        "lifestyle": ["Conselho 1 de estilo de vida", "Conselho 2", "Conselho 3"]
      },
      "professionalNotes": "Observações técnicas do Dr. NutriMax sobre o plano e expectativas de resultados"
    }

    ### INSTRUÇÕES FINAIS CRÍTICAS:
    1. Complete TODOS os 7 dias da semana (segunda a domingo) com o mesmo nível de detalhe
    2. Varie as refeições entre os dias para evitar monotonia
    3. Mantenha a meta calórica diária com variação máxima de ±10%
    4. Balance macronutrientes conforme objetivo: 
       - Perda de peso: 30-35% proteína, 35-40% carbo, 25-30% gordura
       - Ganho muscular: 25-30% proteína, 45-50% carbo, 20-25% gordura
       - Manutenção: 25-30% proteína, 40-45% carbo, 25-30% gordura
    5. Inclua fibras adequadas (25-35g/dia)
    6. Considere o horário de treino nas refeições pré e pós-treino
    7. Use os alimentos selecionados pelo paciente de forma estratégica
    8. Retorne APENAS o JSON, sem texto adicional
    `;

    // Chamar API da xAI Grok-3 Mini
    const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        stream: false
      }),
    });

    if (!xaiResponse.ok) {
      throw new Error(`Erro da API xAI: ${xaiResponse.status}`);
    }

    const xaiData = await xaiResponse.json();
    const content = xaiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Nenhum conteúdo retornado pela API xAI');
    }

    // Parse do JSON retornado
    let mealPlan;
    try {
      const cleanContent = content.replace(/```json|```/g, '').trim();
      mealPlan = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      throw new Error('Erro ao processar resposta da IA');
    }

    // Adicionar propriedades extras
    mealPlan.userCalories = userData.dailyCalories;
    mealPlan.generatedBy = 'grok-3-mini';

    console.log('Plano alimentar gerado com sucesso via Grok-3 Mini');
    
    return new Response(
      JSON.stringify({ mealPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro durante o processo:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar plano alimentar',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
