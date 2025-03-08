
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan, ProtocolFood, DayPlan } from "../types";

interface GenerateMealPlanParams {
  userData: {
    id?: string;
    weight: number;
    height: number;
    age: number;
    gender: string;
    activityLevel: string;
    goal?: string;
    dailyCalories: number;
  };
  selectedFoods: ProtocolFood[];
  foodsByMealType: Record<string, ProtocolFood[]>; 
  preferences: DietaryPreferences;
  addTransaction?: (params: any) => Promise<void>;
}

// Função para traduzir os tipos de refeições para português
const translateMealType = (mealType: string): string => {
  const translations: Record<string, string> = {
    'breakfast': 'café da manhã',
    'morningSnack': 'lanche da manhã',
    'lunch': 'almoço',
    'afternoonSnack': 'lanche da tarde',
    'dinner': 'jantar',
    'eveningSnack': 'ceia'
  };
  return translations[mealType] || mealType;
};

// Função auxiliar para converter os nomes dos alimentos para uma string
const convertFoodsToString = (foods: ProtocolFood[]): string => {
  return foods.map(food => food.name).join(", ");
};

export const generateMealPlan = async ({
  userData,
  selectedFoods,
  foodsByMealType,
  preferences,
  addTransaction
}: GenerateMealPlanParams): Promise<MealPlan | null> => {
  console.log("🚀 Iniciando geração do plano alimentar com o agente Nutri+");
  console.log(`👤 Dados do usuário: ${userData.weight}kg, ${userData.height}cm, ${userData.age} anos, ${userData.gender}`);
  console.log(`🥅 Meta: ${userData.goal}, Calorias diárias: ${userData.dailyCalories}kcal`);
  console.log(`🍎 Alimentos selecionados: ${selectedFoods.length}`);
  console.log(`🥗 Preferências alimentares:`, preferences);
  
  try {
    console.log("📡 Chamando função edge do Supabase - llama-completion");
    
    // Preparar os alimentos por tipo de refeição em português
    const foodsByMealTypePortuguese: Record<string, string> = {};
    
    Object.entries(foodsByMealType).forEach(([mealType, foods]) => {
      const translatedMealType = translateMealType(mealType);
      foodsByMealTypePortuguese[translatedMealType] = convertFoodsToString(foods);
    });
    
    // Traduzir o gênero para português
    const genderInPortuguese = userData.gender === 'male' ? 'masculino' : 'feminino';
    
    // Traduzir o nível de atividade para português
    let activityLevelInPortuguese = userData.activityLevel;
    switch (userData.activityLevel) {
      case 'sedentary': activityLevelInPortuguese = 'sedentário'; break;
      case 'light': activityLevelInPortuguese = 'leve'; break;
      case 'moderate': activityLevelInPortuguese = 'moderado'; break;
      case 'active': activityLevelInPortuguese = 'ativo'; break;
      case 'very_active': activityLevelInPortuguese = 'muito ativo'; break;
    }
    
    // Traduzir o objetivo para português
    let goalInPortuguese = userData.goal || 'manutenção';
    switch (userData.goal) {
      case 'weight_loss': goalInPortuguese = 'perda de peso'; break;
      case 'maintenance': goalInPortuguese = 'manutenção'; break;
      case 'muscle_gain': goalInPortuguese = 'ganho de massa muscular'; break;
    }
    
    // Traduzir restrições dietéticas para português
    const translatedRestrictions: string[] = [];
    if (preferences.dietaryRestrictions) {
      preferences.dietaryRestrictions.forEach(restriction => {
        switch (restriction) {
          case 'gluten_free': translatedRestrictions.push('sem glúten'); break;
          case 'lactose_free': translatedRestrictions.push('sem lactose'); break;
          case 'vegetarian': translatedRestrictions.push('vegetariano'); break;
          case 'vegan': translatedRestrictions.push('vegano'); break;
          case 'low_carb': translatedRestrictions.push('baixo carboidrato'); break;
          case 'keto': translatedRestrictions.push('cetogênico'); break;
          default: translatedRestrictions.push(restriction);
        }
      });
    }
    
    // Criar o prompt em português
    const prompt = `
    Por favor, crie um plano alimentar semanal detalhado para uma pessoa com as seguintes características:
    
    - Peso: ${userData.weight} kg
    - Altura: ${userData.height} cm
    - Idade: ${userData.age} anos
    - Gênero: ${genderInPortuguese}
    - Nível de atividade: ${activityLevelInPortuguese}
    - Objetivo: ${goalInPortuguese}
    - Calorias diárias: ${userData.dailyCalories} kcal
    
    Alimentos preferidos por refeição:
    ${Object.entries(foodsByMealTypePortuguese)
      .map(([mealType, foods]) => `- ${mealType}: ${foods}`)
      .join('\n')}
    
    ${preferences.hasAllergies && preferences.allergies && preferences.allergies.length > 0 
      ? `Alergias alimentares: ${preferences.allergies.join(', ')}` 
      : 'Sem alergias alimentares.'}
    
    ${translatedRestrictions.length > 0 
      ? `Restrições dietéticas: ${translatedRestrictions.join(', ')}` 
      : 'Sem restrições dietéticas.'}
    
    ${preferences.trainingTime 
      ? `Horário de treino: ${preferences.trainingTime}` 
      : 'Sem horário de treino definido.'}
    
    Por favor, retorne o plano alimentar em formato JSON, com os seguintes elementos:
    - Um plano semanal completo (7 dias) com "weeklyPlan" contendo dias da semana em português (segunda, terça, etc.)
    - Cada dia deve ter 5 refeições: café da manhã, lanche da manhã, almoço, lanche da tarde, jantar
    - Cada refeição deve incluir alimentos dos selecionados quando possível
    - Inclua os totais diários de calorias, proteínas, carboidratos, gorduras e fibras
    - Inclua também recomendações gerais em português e uma média semanal dos macronutrientes
    
    IMPORTANTE: Todos os nomes de alimentos, refeições e descrições DEVEM estar em português. Todos os valores de macronutrientes devem ser numéricos (sem "g").
    `;
    
    // Chamar a função edge llama-completion
    const { data, error } = await supabase.functions.invoke('llama-completion', {
      body: {
        prompt,
        temperature: 0.4,
        language: "pt-BR"
      }
    });

    if (error) {
      console.error("❌ Erro ao chamar a função llama-completion:", error);
      toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
      return null;
    }

    if (!data?.completion) {
      console.error("❌ Nenhum plano alimentar retornado pela função llama-completion");
      console.error("Resposta completa:", data);
      toast.error("Não foi possível gerar o plano alimentar. Por favor, tente novamente.");
      return null;
    }

    console.log("✅ Resposta recebida da função llama-completion");
    console.log("📋 Primeiros 200 caracteres da resposta:", data.completion.substring(0, 200) + "...");
    
    // Tentar extrair o JSON da resposta
    let jsonContent = data.completion;
    
    // Verificar se o conteúdo precisa ser extraído (se a resposta contém mais que apenas o JSON)
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
      jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
      console.log("🔍 JSON extraído da resposta");
    }
    
    // Tentar analisar o JSON
    let mealPlan: MealPlan;
    
    try {
      mealPlan = JSON.parse(jsonContent);
      console.log("✅ JSON analisado com sucesso");
    } catch (parseError) {
      console.error("❌ Erro ao analisar JSON:", parseError);
      console.error("Conteúdo JSON com problema:", jsonContent);
      toast.error("Erro ao processar o plano alimentar. Por favor, tente novamente.");
      return null;
    }
    
    // Verificar se mealPlan tem a estrutura esperada
    if (!mealPlan || typeof mealPlan !== 'object') {
      console.error("❌ Estrutura de plano alimentar inválida");
      toast.error("O plano alimentar gerado tem formato inválido. Por favor, tente novamente.");
      return null;
    }
    
    // Verificar se a estrutura contém weeklyPlan - correção do problema anterior
    if (!mealPlan.weeklyPlan) {
      // Se não houver weeklyPlan diretamente, verificar se existe uma estrutura aninhada
      if (Object.keys(mealPlan).length === 1 && typeof mealPlan[Object.keys(mealPlan)[0]] === 'object') {
        // Temos uma estrutura aninhada, vamos tentar extrair o plano real
        const potentialPlan = mealPlan[Object.keys(mealPlan)[0]];
        if (potentialPlan && potentialPlan.weeklyPlan) {
          console.log("⚠️ Estrutura aninhada detectada, extraindo o plano alimentar");
          mealPlan = potentialPlan;
        }
      }
      
      // Se ainda não temos weeklyPlan, o formato está incorreto
      if (!mealPlan.weeklyPlan) {
        console.error("❌ Formato de plano sem weeklyPlan:", Object.keys(mealPlan));
        toast.error("O plano alimentar gerado tem formato inválido (sem weeklyPlan). Por favor, tente novamente.");
        return null;
      }
    }
    
    console.log("✅ Plano alimentar estruturado:", Object.keys(mealPlan));
    console.log("📋 Dias no plano:", mealPlan.weeklyPlan ? Object.keys(mealPlan.weeklyPlan) : "Nenhum");
    console.log("🧠 Modelo utilizado:", data.modelUsed || "Desconhecido");
    
    // Garantir que userCalories esteja presente
    if (userData.dailyCalories) {
      mealPlan.userCalories = userData.dailyCalories;
    }
    
    // Adicionar informação sobre o modelo usado
    mealPlan.generatedBy = data.modelUsed || "llama-completion";
    
    // Salvar o plano alimentar no banco de dados se o usuário estiver autenticado
    if (userData.id) {
      try {
        console.log("💾 Tentando salvar plano alimentar para o usuário:", userData.id);
        
        // Criar uma versão limpa do plano para armazenamento no banco de dados
        const mealPlanForStorage = JSON.parse(JSON.stringify(mealPlan));
        
        const { error: saveError } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userData.id,
            plan_data: mealPlanForStorage,
            calories: userData.dailyCalories,
            generated_by: data.modelUsed || "llama-completion",
            preferences: preferences
          });

        if (saveError) {
          console.error("❌ Erro ao salvar plano alimentar:", saveError);
          toast.error("Erro ao salvar o plano no histórico: " + saveError.message);
        } else {
          console.log("💾 Plano alimentar salvo no banco de dados com sucesso");
          toast.success("Plano alimentar salvo no histórico");
          
          // Adicionar transação se a função de carteira estiver disponível
          if (addTransaction) {
            await addTransaction({
              amount: 10,
              type: 'expense',
              description: 'Geração de plano alimentar',
              category: 'meal_plan'
            });
            console.log("💰 Transação adicionada para geração do plano alimentar");
          }
        }
      } catch (dbError) {
        console.error("❌ Erro ao salvar plano alimentar no banco de dados:", dbError);
        toast.error("Erro ao salvar plano no histórico. Verifique a conexão e tente novamente.");
      }
    } else {
      console.warn("⚠️ Usuário não está autenticado, plano não será salvo no histórico");
      toast.warning("Faça login para salvar o plano no histórico");
    }

    return mealPlan;
  } catch (error) {
    console.error("❌ Erro inesperado em generateMealPlan:", error);
    toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
    return null;
  }
};
