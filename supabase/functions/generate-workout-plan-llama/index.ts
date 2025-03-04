
async function generateWorkoutPlanWithGroq(
  exercises: any[],
  preferences: any,
  customSystemPrompt?: string,
  useCustomPrompt = false,
  apiKey?: string,
  agentName = "TRENE2025"
) {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Groq API key is required but not provided");
  }
  
  if (!apiKey.startsWith("gsk_")) {
    throw new Error("Invalid Groq API key format. Keys should start with 'gsk_'");
  }

  const defaultSystemPrompt = `Você é ${agentName}, um excelente profissional de educação física, especializado em gerar planos de exercícios personalizados. Com base nos dados fornecidos pelo usuário, você deve:

Coletar os Dados do Usuário:
- Idade, peso, altura, sexo.
- Objetivo (perder peso, manter peso, ganhar massa).
- Nível de atividade física (sedentário, leve, moderado, intenso).
- Tipos de exercícios preferidos (força, cardio, mobilidade).
- Local de treino (academia, casa, ar livre, sem equipamentos).

Consultar o Banco de Dados:
- Analisar CUIDADOSAMENTE cada exercício considerando sua descrição, grupo muscular, tipo, GIF e equipamento necessário.
- Escolher exercícios ideais para as condições físicas e objetivos específicos do usuário.
- PRIORIZAR exercícios com GIFs disponíveis para melhor visualização do usuário.
- UTILIZAR os metadados detalhados de cada exercício para fazer as escolhas mais adequadas.

Gerar o Plano de Exercícios:
- Criar um plano personalizado com base nos dados do usuário.
- Incluir exercícios que correspondam ao objetivo, nível de atividade física e local de treino.
- SEMPRE priorizar exercícios que possuam GIFs (gif_url não vazio).
- SEMPRE analisar as descrições dos exercícios para entender exatamente como eles funcionam.
- Garantir variedade e progressão adequada de exercícios.
- Considerar quaisquer condições de saúde ou limitações indicadas.

Para cada exercício, incluir:
- Nome do exercício exatamente como está na lista.
- ID do exercício exatamente como está na lista.
- Descrição detalhada (séries, repetições, duração e carga).
- GIF demonstrativo (usando o gif_url fornecido).
- Informações sobre grupo muscular trabalhado.

Gerar um plano de treinos para 7 dias, incluindo:
- Exercícios, séries, repetições, descanso e carga de treino (intensidade, volume e progressão).
- Um aquecimento específico para cada tipo de treino.
- Um alongamento apropriado após cada sessão.
- Adaptações dos exercícios ao local de treino.
- Priorização da queima de gordura, combinando treinos de força e cardio.
- Sugestões de progressão semanal (aumento de carga, repetições ou intensidade).
- Crítica do plano gerado, sugerindo melhorias se necessário.

Exemplo de Carga de Treino:
- Intensidade: Moderada a alta (70-85% da capacidade máxima).
- Volume: 3-4 séries por exercício, com 10-15 repetições.
- Progressão: Aumentar carga ou repetições semanalmente (5-10%).

Formato de Saída (para cada dia):
- Dia da semana: Tipo de treino (Força, Cardio, etc.).
- Aquecimento: Descrição detalhada e específica para o treino do dia.
- Exercícios: Nome, séries, repetições, carga, descanso.
- Alongamento: Descrição específica para os músculos trabalhados.
- Carga de Treino: Intensidade, volume, progressão.
- Crítica e Sugestões: Análise do plano gerado.

IMPORTANTE: 
- Cada dia deve ser diferente. 
- SEMPRE priorize exercícios com GIFs disponíveis.
- ANALISE as descrições dos exercícios para entender sua execução.
- Considere as restrições de equipamento e condições de saúde.
- O plano deve ser variado e personalizado.
- Use os IDs dos exercícios fornecidos para identificá-los corretamente.
- Crie um plano único e não use templates pré-definidos.
- Utilize as descrições detalhadas dos exercícios para escolher os mais adequados.`;

  const systemPrompt = useCustomPrompt && customSystemPrompt ? customSystemPrompt : defaultSystemPrompt;

  const exerciseList = exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    muscle_group: ex.muscle_group,
    exercise_type: ex.exercise_type,
    difficulty: ex.difficulty,
    equipment_needed: ex.equipment_needed,
    description: ex.description,
    gif_url: ex.gif_url,
    primary_muscles_worked: ex.primary_muscles_worked,
    secondary_muscles_worked: ex.secondary_muscles_worked,
    min_sets: ex.min_sets,
    max_sets: ex.max_sets,
    min_reps: ex.min_reps,
    max_reps: ex.max_reps,
    rest_time_seconds: ex.rest_time_seconds,
    suitable_for_conditions: ex.suitable_for_conditions,
    contraindicated_conditions: ex.contraindicated_conditions
  }));

  const userPrompt = `
Com base nas preferências do usuário a seguir, crie um plano de treino personalizado dividido por dias da semana.

PREFERÊNCIAS DO USUÁRIO:
- Idade: ${preferences.age} anos
- Sexo: ${preferences.gender === 'male' ? 'Masculino' : 'Feminino'}
- Peso: ${preferences.weight} kg
- Altura: ${preferences.height} cm
- Objetivo: ${translateGoal(preferences.goal)}
- Nível de atividade física: ${translateActivityLevel(preferences.activity_level)}
- Tipos de exercícios preferidos: ${translateExerciseTypes(preferences.preferred_exercise_types)}
- Local de treino: ${translateTrainingLocation(preferences)}
${preferences.health_conditions && preferences.health_conditions.length > 0 ? 
  `- Condições de saúde: ${preferences.health_conditions.join(', ')}` : ''}

INSTRUÇÕES DETALHADAS:
1. ANALISE CUIDADOSAMENTE as descrições, metadados e GIFs de cada exercício para escolher os mais adequados
2. PRIORIZE exercícios que possuem GIFs (gif_url não vazio) para que o usuário possa visualizar a execução correta
3. UTILIZE o ID correto de cada exercício exatamente como fornecido na lista
4. Escolha exercícios adequados ao equipamento disponível para o usuário (${translateTrainingLocation(preferences)})
5. Crie um plano de treino completo para 7 dias da semana (Segunda a Domingo)
6. Para cada dia, inclua:
   - Um aquecimento específico e detalhado para o treino do dia
   - Lista de exercícios com séries, repetições e tempo de descanso entre séries
   - Sugestões de intensidade considerando o nível do usuário
   - Um alongamento/volta à calma apropriado para os músculos trabalhados
   - Informações sobre a carga de treino: intensidade, volume e progressão
7. Escolha apenas exercícios da lista fornecida abaixo, analisando suas descrições e metadados
8. Alterne os grupos musculares e tipos de exercícios durante a semana de forma equilibrada
9. Inclua pelo menos um dia de descanso ou treino leve/recuperativo
10. Adicione uma crítica e sugestões ao final do plano
11. Responda com um objeto JSON válido seguindo o formato abaixo

EXERCÍCIOS DISPONÍVEIS:
${JSON.stringify(exerciseList).substring(0, 8000)}

FORMATO DE RESPOSTA: 
{
  "goal": "objetivo traduzido",
  "start_date": "2023-03-01",
  "end_date": "2023-03-07",
  "workout_sessions": [
    {
      "day_number": número do dia (1-7),
      "day_name": "Nome do dia (Segunda-feira, etc.)",
      "focus": "Foco do treino (Ex: Força Superior, Cardio, etc.)",
      "warmup_description": "descrição detalhada do aquecimento",
      "cooldown_description": "descrição detalhada da volta à calma",
      "session_exercises": [
        {
          "exercise": {
            "id": "id do exercício da lista",
            "name": "nome do exercício",
            "description": "descrição do exercício",
            "gif_url": "url do gif do exercício",
            "muscle_group": "grupo muscular",
            "exercise_type": "tipo de exercício"
          },
          "sets": número de séries,
          "reps": número de repetições,
          "rest_time_seconds": tempo de descanso em segundos,
          "intensity": "descrição da intensidade recomendada"
        }
      ],
      "training_load": {
        "intensity": "descrição da intensidade geral (Ex: Moderada 70-75%)",
        "volume": "descrição do volume (Ex: 15 séries no total)",
        "progression": "sugestão de progressão (Ex: Aumentar 5% na carga)"
      }
    }
  ],
  "critique": {
    "strengths": ["ponto forte 1", "ponto forte 2"],
    "suggestions": ["sugestão 1", "sugestão 2"],
    "notes": "notas adicionais sobre o plano"
  }
}`;

  try {
    console.log("Calling Groq API with Llama 3...");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Groq API Error:", errorData);
      
      if (errorData.includes("json_validate_failed")) {
        throw new Error(errorData);
      }
      
      throw new Error(`Groq API Error: ${response.status} ${response.statusText}\n${errorData}`);
    }

    const data = await response.json();
    console.log("Groq API response received");

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from Groq API");
    }

    const content = data.choices[0].message.content;
    let workoutPlan;

    try {
      if (typeof content === 'object') {
        workoutPlan = content;
        console.log("Using pre-parsed JSON from Groq API");
      } else if (typeof content === 'string') {
        console.log("Parsing string content from Groq API");
        
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                          content.match(/```\s*([\s\S]*?)\s*```/) || 
                          content.match(/({[\s\S]*})/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1];
          workoutPlan = JSON.parse(jsonString);
          console.log("Successfully parsed JSON from markdown/code block");
        } else {
          console.error("No JSON pattern found in content");
          throw new Error("Could not extract valid JSON from model response");
        }
      } else {
        throw new Error(`Unexpected content type: ${typeof content}`);
      }
      
      console.log("Successfully processed workout plan response");
      
      // Verify that exercise GIFs are included where possible
      let totalExercises = 0;
      let exercisesWithGifs = 0;
      
      workoutPlan.workout_sessions.forEach(session => {
        session.session_exercises.forEach(ex => {
          totalExercises++;
          if (ex.exercise.gif_url) {
            exercisesWithGifs++;
          }
        });
      });
      
      console.log(`Generated plan includes ${exercisesWithGifs}/${totalExercises} exercises with GIFs`);
      
    } catch (parseError) {
      console.error("Error parsing workout plan JSON:", parseError);
      console.log("Raw content:", content);
      throw new Error(`Error parsing workout plan JSON: ${parseError.message}`);
    }

    return workoutPlan;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    
    if (error.message) {
      if (error.message.includes("Invalid API Key") || 
          error.message.includes("invalid_api_key")) {
        throw new Error("Invalid Groq API key. Please update your API key in the admin settings.");
      }
      
      if (error.message.includes("Validation errors")) {
        throw new Error(`Groq API key contains validation errors: ${error.message}`);
      }
      
      if (error.message.includes("json_validate_failed")) {
        throw new Error(error.message);
      }
    }
    
    throw new Error(`Failed to generate workout plan with Groq: ${error.message}`);
  }
}
