
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { preferences, userId } = await req.json()
    console.log('Recebendo solicitação de plano de treino:', { preferences, userId })

    // Configurar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar exercícios disponíveis
    const { data: exercises, error: exercisesError } = await supabaseClient
      .from('exercises')
      .select('*')
    
    if (exercisesError) {
      throw new Error(`Erro ao buscar exercícios: ${exercisesError.message}`)
    }

    console.log(`Encontrados ${exercises.length} exercícios disponíveis`)

    // Analisar dados do usuário com IA
    const analysis = await analyzeUserPreferences(preferences)
    console.log('Análise das preferências do usuário:', analysis)

    // Filtrar exercícios baseado na análise
    const filteredExercises = filterExercisesByAnalysis(exercises, analysis, preferences)
    console.log(`Selecionados ${filteredExercises.length} exercícios após filtro`)

    // Gerar plano personalizado
    const workoutPlan = await generatePersonalizedPlan(filteredExercises, analysis, preferences)
    console.log('Plano de treino gerado:', workoutPlan)

    // Salvar o plano no banco de dados
    const { error: savePlanError } = await supabaseClient
      .from('workout_plans')
      .insert({
        user_id: userId,
        goal: preferences.goal,
        start_date: new Date().toISOString(),
        end_date: getEndDate(30), // Plano de 30 dias
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (savePlanError) {
      throw new Error(`Erro ao salvar plano: ${savePlanError.message}`)
    }

    // Retornar o plano gerado
    return new Response(
      JSON.stringify(workoutPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro ao gerar plano:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function analyzeUserPreferences(preferences: any) {
  console.log('Iniciando análise das preferências do usuário')
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
  
  try {
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
            content: `Você é um especialista em educação física e prescrição de exercícios.
                     Analise os dados do usuário e forneça recomendações para um plano de treino seguro e efetivo.`
          },
          {
            role: 'user',
            content: `Analise os seguintes dados do usuário e forneça recomendações específicas para exercícios:
                     Idade: ${preferences.age}
                     Peso: ${preferences.weight}kg
                     Altura: ${preferences.height}cm
                     Gênero: ${preferences.gender}
                     Objetivo: ${preferences.goal}
                     Nível de atividade: ${preferences.activity_level}
                     Tipos de exercício preferidos: ${preferences.preferred_exercise_types.join(', ')}
                     Equipamentos disponíveis: ${preferences.available_equipment.join(', ')}
                     ${preferences.health_conditions ? `Condições de saúde: ${preferences.health_conditions.join(', ')}` : 'Sem condições de saúde reportadas'}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    const data = await response.json()
    console.log('Resposta da análise de IA:', data)
    return data.choices[0].message.content
  } catch (error) {
    console.error('Erro na análise de IA:', error)
    throw new Error('Falha ao analisar preferências do usuário')
  }
}

function filterExercisesByAnalysis(exercises: any[], analysis: string, preferences: any) {
  console.log('Filtrando exercícios baseado na análise')
  
  return exercises.filter(exercise => {
    // Verificar equipamentos disponíveis
    if (preferences.available_equipment.includes('all')) {
      return true
    }
    
    if (!exercise.equipment_needed) {
      return true
    }
    
    return exercise.equipment_needed.some((equipment: string) => 
      preferences.available_equipment.includes(equipment)
    )
  }).filter(exercise => {
    // Filtrar por tipo de exercício preferido
    return preferences.preferred_exercise_types.includes(exercise.exercise_type)
  }).filter(exercise => {
    // Filtrar por nível de dificuldade baseado na experiência
    switch(preferences.activity_level) {
      case 'sedentary':
      case 'light':
        return exercise.difficulty === 'beginner'
      case 'moderate':
        return ['beginner', 'intermediate'].includes(exercise.difficulty)
      case 'intense':
        return true
      default:
        return true
    }
  })
}

async function generatePersonalizedPlan(exercises: any[], analysis: string, preferences: any) {
  console.log('Gerando plano personalizado')
  
  // Determinar frequência de treino baseado no nível de atividade
  const sessionsPerWeek = getSessionsPerWeek(preferences.activity_level)
  
  // Criar sessões de treino
  const workoutSessions = []
  for (let day = 1; day <= sessionsPerWeek; day++) {
    const session = {
      day_number: day,
      warmup_description: generateWarmupDescription(preferences),
      cooldown_description: generateCooldownDescription(),
      exercises: selectExercisesForSession(exercises, day, preferences)
    }
    workoutSessions.push(session)
  }

  return {
    id: crypto.randomUUID(),
    user_id: preferences.userId,
    goal: preferences.goal,
    start_date: new Date().toISOString(),
    end_date: getEndDate(30),
    workout_sessions: workoutSessions,
    user_fitness_level: getUserFitnessLevel(preferences.activity_level)
  }
}

function getSessionsPerWeek(activityLevel: string): number {
  switch(activityLevel) {
    case 'sedentary': return 3
    case 'light': return 4
    case 'moderate': return 5
    case 'intense': return 6
    default: return 3
  }
}

function generateWarmupDescription(preferences: any): string {
  const baseWarmup = "5-10 minutos de:\n- Alongamento dinâmico\n- Mobilidade articular"
  
  if (preferences.activity_level === 'sedentary') {
    return `${baseWarmup}\n- Caminhada leve`
  }
  
  return `${baseWarmup}\n- Exercício cardiovascular leve\n- Exercícios de mobilidade específicos`
}

function generateCooldownDescription(): string {
  return "5-10 minutos de:\n- Alongamento estático\n- Exercícios de respiração\n- Relaxamento muscular"
}

function selectExercisesForSession(exercises: any[], dayNumber: number, preferences: any) {
  const exercisesPerSession = Math.min(8, Math.max(5, Math.floor(exercises.length / 3)))
  
  // Dividir exercícios por grupo muscular para garantir distribuição adequada
  const groupedExercises = exercises.reduce((acc: any, exercise: any) => {
    if (!acc[exercise.muscle_group]) {
      acc[exercise.muscle_group] = []
    }
    acc[exercise.muscle_group].push(exercise)
    return acc
  }, {})

  const selectedExercises = []
  const muscleGroups = Object.keys(groupedExercises)
  
  // Selecionar exercícios alternando grupos musculares
  for (let i = 0; i < exercisesPerSession; i++) {
    const groupIndex = (i + dayNumber) % muscleGroups.length
    const group = muscleGroups[groupIndex]
    const exercisesInGroup = groupedExercises[group]
    
    if (exercisesInGroup && exercisesInGroup.length > 0) {
      const exercise = exercisesInGroup[Math.floor(Math.random() * exercisesInGroup.length)]
      selectedExercises.push({
        name: exercise.name,
        sets: getSetRange(preferences.activity_level),
        reps: getRepsRange(preferences.goal, exercise.exercise_type),
        rest_time_seconds: getRestTime(preferences.goal, exercise.exercise_type),
        gifUrl: exercise.gif_url,
        notes: exercise.description
      })
    }
  }

  return selectedExercises
}

function getSetRange(activityLevel: string): number {
  switch(activityLevel) {
    case 'sedentary': return 2
    case 'light': return 3
    case 'moderate': return 4
    case 'intense': return 5
    default: return 3
  }
}

function getRepsRange(goal: string, exerciseType: string): number {
  if (exerciseType === 'cardio') return 0 // Para exercícios de cardio, não usamos repetições

  switch(goal) {
    case 'lose_weight': return 15
    case 'gain_mass': return 8
    case 'maintain': return 12
    default: return 10
  }
}

function getRestTime(goal: string, exerciseType: string): number {
  if (exerciseType === 'cardio') return 30

  switch(goal) {
    case 'lose_weight': return 30
    case 'gain_mass': return 90
    case 'maintain': return 60
    default: return 60
  }
}

function getUserFitnessLevel(activityLevel: string): "beginner" | "intermediate" | "advanced" {
  switch(activityLevel) {
    case 'sedentary':
    case 'light':
      return 'beginner'
    case 'moderate':
      return 'intermediate'
    case 'intense':
      return 'advanced'
    default:
      return 'beginner'
  }
}

function getEndDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}
