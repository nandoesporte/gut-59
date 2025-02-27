
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { calculateDailyCalories } from "./calculators.ts";
import { validateInput } from "./validator.ts";
import { generateRecommendations } from "./recommendations.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    console.log("Requisição recebida:", JSON.stringify(requestData));

    const { userData, selectedFoods, dietaryPreferences } = requestData;

    // Validação básica dos dados
    validateInput(userData, selectedFoods, dietaryPreferences);

    // Calcular necessidades calóricas se não fornecidas
    if (!userData.dailyCalories) {
      userData.dailyCalories = calculateDailyCalories(
        userData.weight,
        userData.height,
        userData.age,
        userData.gender,
        userData.activityLevel,
        userData.goal
      );
    }

    console.log(`Necessidade calórica calculada: ${userData.dailyCalories} kcal`);

    // Construir o plano alimentar
    console.log("Construindo modelo básico de plano alimentar...");
    
    // Criar um esqueleto básico do plano alimentar
    const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const mealTypes = ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"];
    
    // Função para calcular as macros baseadas no objetivo
    const calculateMacrosDistribution = (calories: number, goal: string) => {
      let proteinPercentage, carbsPercentage, fatsPercentage;
      
      if (goal === "lose_weight" || goal === "lose") {
        proteinPercentage = 0.35; // 35% proteína
        carbsPercentage = 0.35;   // 35% carboidratos
        fatsPercentage = 0.30;    // 30% gorduras
      } else if (goal === "gain_weight" || goal === "gain") {
        proteinPercentage = 0.30; // 30% proteína
        carbsPercentage = 0.45;   // 45% carboidratos
        fatsPercentage = 0.25;    // 25% gorduras
      } else { // maintain
        proteinPercentage = 0.30; // 30% proteína
        carbsPercentage = 0.40;   // 40% carboidratos
        fatsPercentage = 0.30;    // 30% gorduras
      }
      
      const proteinCalories = calories * proteinPercentage;
      const carbsCalories = calories * carbsPercentage;
      const fatsCalories = calories * fatsPercentage;
      
      // Proteína e carboidratos têm 4 calorias por grama, gorduras têm 9 calorias por grama
      const proteinGrams = proteinCalories / 4;
      const carbsGrams = carbsCalories / 4;
      const fatsGrams = fatsCalories / 9;
      
      return {
        protein: Math.round(proteinGrams),
        carbs: Math.round(carbsGrams),
        fats: Math.round(fatsGrams),
        fiber: Math.round(carbsGrams * 0.2) // ~20% dos carboidratos como fibra
      };
    };
    
    // Calcular distribuição de calorias por refeição
    const mealCaloriesDistribution = {
      breakfast: 0.25,       // 25% das calorias
      morningSnack: 0.10,    // 10% das calorias
      lunch: 0.35,           // 35% das calorias
      afternoonSnack: 0.10,  // 10% das calorias
      dinner: 0.20           // 20% das calorias
    };
    
    // Distribuir alimentos selecionados entre as refeições
    const categorizedFoods: Record<string, typeof selectedFoods> = {
      breakfast: [],
      morningSnack: [],
      lunch: [],
      afternoonSnack: [],
      dinner: []
    };
    
    // Lista de alimentos por categoria/tipo
    console.log("Categorizando alimentos selecionados...");
    
    // Tentar distribuir os alimentos de forma inteligente
    selectedFoods.forEach(food => {
      const foodName = food.name.toLowerCase();
      
      // Tentar classificar pela análise do nome
      if (foodName.includes("café") || foodName.includes("pão") || foodName.includes("cereal") || foodName.includes("leite") || foodName.includes("iogurte")) {
        categorizedFoods.breakfast.push(food);
      }
      else if (foodName.includes("fruta") || foodName.includes("barra") || foodName.includes("castanha") || foodName.includes("nozes")) {
        categorizedFoods.morningSnack.push(food);
        categorizedFoods.afternoonSnack.push(food);
      }
      else if (foodName.includes("arroz") || foodName.includes("feijão") || foodName.includes("carne") || foodName.includes("frango") || foodName.includes("peixe") || foodName.includes("legume")) {
        categorizedFoods.lunch.push(food);
        categorizedFoods.dinner.push(food);
      }
      else {
        // Se não conseguir categorizar, coloca em todas as refeições
        categorizedFoods.breakfast.push(food);
        categorizedFoods.morningSnack.push(food);
        categorizedFoods.lunch.push(food);
        categorizedFoods.afternoonSnack.push(food);
        categorizedFoods.dinner.push(food);
      }
    });
    
    // Garantir que todas as categorias tenham pelo menos alguns alimentos
    for (const mealType of mealTypes) {
      if (categorizedFoods[mealType].length < 3) {
        categorizedFoods[mealType] = [...selectedFoods]; // Usar todos os alimentos
      }
    }
    
    // Criar o plano alimentar
    const weeklyPlan: Record<string, any> = {};
    let weeklyCalories = 0;
    let weeklyProtein = 0;
    let weeklyCarbs = 0;
    let weeklyFats = 0;
    let weeklyFiber = 0;
    
    console.log("Gerando plano semanal...");
    
    for (const day of weekdays) {
      const dailyCalories = userData.dailyCalories;
      const dailyMacros = calculateMacrosDistribution(dailyCalories, userData.goal);
      
      const meals: Record<string, any> = {};
      let dayTotalCalories = 0;
      let dayTotalProtein = 0;
      let dayTotalCarbs = 0;
      let dayTotalFats = 0;
      let dayTotalFiber = 0;
      
      for (const mealType of mealTypes) {
        const mealCalories = dailyCalories * mealCaloriesDistribution[mealType];
        const mealMacros = {
          protein: dailyMacros.protein * mealCaloriesDistribution[mealType],
          carbs: dailyMacros.carbs * mealCaloriesDistribution[mealType],
          fats: dailyMacros.fats * mealCaloriesDistribution[mealType],
          fiber: dailyMacros.fiber * mealCaloriesDistribution[mealType]
        };
        
        // Selecionar alimentos aleatórios para esta refeição
        const availableFoods = [...categorizedFoods[mealType]];
        const selectedMealFoods = [];
        
        // Número de alimentos por refeição
        let foodCount = mealType === "lunch" || mealType === "dinner" ? 4 : 3;
        
        for (let i = 0; i < foodCount && availableFoods.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * availableFoods.length);
          const food = availableFoods.splice(randomIndex, 1)[0];
          
          // Calcular porção para contribuir para as calorias da refeição
          const portionMultiplier = (mealCalories / foodCount) / food.calories;
          const portion = Math.round(portionMultiplier * 100) / 100; // Arredondar para 2 casas decimais
          
          selectedMealFoods.push({
            name: food.name,
            portion: portion > 0.1 ? portion : 0.5, // Garantir porção mínima
            unit: food.portionUnit || "g",
            details: `${food.protein}g proteína, ${food.carbs}g carboidratos, ${food.fats}g gorduras`
          });
        }
        
        meals[mealType] = {
          description: `Refeição balanceada para ${mealType === "breakfast" ? "café da manhã" : 
                         mealType === "morningSnack" ? "lanche da manhã" : 
                         mealType === "lunch" ? "almoço" : 
                         mealType === "afternoonSnack" ? "lanche da tarde" : "jantar"}`,
          foods: selectedMealFoods,
          calories: Math.round(mealCalories),
          macros: {
            protein: Math.round(mealMacros.protein),
            carbs: Math.round(mealMacros.carbs),
            fats: Math.round(mealMacros.fats),
            fiber: Math.round(mealMacros.fiber)
          }
        };
        
        dayTotalCalories += mealCalories;
        dayTotalProtein += mealMacros.protein;
        dayTotalCarbs += mealMacros.carbs;
        dayTotalFats += mealMacros.fats;
        dayTotalFiber += mealMacros.fiber;
      }
      
      weeklyPlan[day] = {
        dayName: day,
        meals: meals,
        dailyTotals: {
          calories: Math.round(dayTotalCalories),
          protein: Math.round(dayTotalProtein),
          carbs: Math.round(dayTotalCarbs),
          fats: Math.round(dayTotalFats),
          fiber: Math.round(dayTotalFiber)
        }
      };
      
      weeklyCalories += dayTotalCalories;
      weeklyProtein += dayTotalProtein;
      weeklyCarbs += dayTotalCarbs;
      weeklyFats += dayTotalFats;
      weeklyFiber += dayTotalFiber;
    }
    
    // Calcular médias semanais
    const weeklyAverage = {
      averageCalories: Math.round(weeklyCalories / 7),
      averageProtein: Math.round(weeklyProtein / 7),
      averageCarbs: Math.round(weeklyCarbs / 7),
      averageFats: Math.round(weeklyFats / 7),
      averageFiber: Math.round(weeklyFiber / 7)
    };
    
    // Gerar recomendações
    const recommendations = generateRecommendations(
      userData.dailyCalories,
      userData.goal,
      dietaryPreferences.trainingTime
    );
    
    // Montar o plano completo
    const mealPlan = {
      weeklyPlan: weeklyPlan,
      weeklyTotals: weeklyAverage,
      recommendations: recommendations
    };
    
    console.log("Plano alimentar gerado com sucesso!");
    
    // Retorna o plano alimentar gerado
    return new Response(
      JSON.stringify({ mealPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Erro:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
