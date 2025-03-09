
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mealPlan, userData, dietaryPreferences } = await req.json()

    const prompt = `Analise o seguinte plano alimentar e sugira melhorias se necessário:

Dados do Usuário:
- Objetivo: ${userData.goal || 'Perda de Peso'} 
- Peso: ${userData.weight}kg
- Altura: ${userData.height}cm
- Idade: ${userData.age}
- Gênero: ${userData.gender}
- Nível de Atividade: ${userData.activityLevel}
- Calorias Diárias: ${userData.dailyCalories}kcal

Restrições Alimentares:
${dietaryPreferences.hasAllergies ? `- Alergias: ${dietaryPreferences.allergies.join(', ')}` : '- Sem alergias'}
${dietaryPreferences.dietaryRestrictions.length > 0 ? `- Restrições: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : '- Sem restrições'}
${dietaryPreferences.trainingTime ? `- Horário de Treino: ${dietaryPreferences.trainingTime}` : '- Sem treino específico'}

Plano Alimentar:
${JSON.stringify(mealPlan, null, 2)}

Por favor, analise:
1. Se as calorias e macronutrientes estão adequados ao objetivo
2. Se a distribuição das refeições está bem equilibrada
3. Se há variedade adequada de alimentos
4. Se as restrições alimentares estão sendo respeitadas
5. Se os horários das refeições são adequados ao horário de treino (se houver)

Forneça:
1. Uma avaliação geral do plano
2. Sugestões específicas de melhorias (se necessário)
3. Recomendações adicionais personalizadas para o usuário
`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um nutricionista especializado em análise de planos alimentares. Forneça análises detalhadas e sugestões práticas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    })

    const data = await response.json()
    const analysis = data.choices[0].message.content

    // Estruturar a resposta
    const formattedResponse = {
      mealPlan,
      analysis,
      isApproved: !analysis.toLowerCase().includes('não recomendado') && 
                  !analysis.toLowerCase().includes('inadequado'),
    }

    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
