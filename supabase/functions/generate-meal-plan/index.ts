
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portion?: number;
  portionUnit?: string;
}

interface UserData {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  dailyCalories: number;
}

interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

const getMealDescription = (mealType: string, goal: string) => {
  const descriptions = {
    breakfast: {
      'weight_loss': "Café da manhã rico em proteínas e fibras para promover saciedade e controle calórico.",
      'muscle_gain': "Café da manhã rico em proteínas e carboidratos complexos para energia e construção muscular.",
      'maintenance': "Café da manhã balanceado para fornecer energia sustentada ao longo da manhã."
    },
    morningSnack: {
      'weight_loss': "Lanche leve e nutritivo para controlar a fome até o almoço.",
      'muscle_gain': "Lanche proteico para manter o aporte nutricional entre refeições.",
      'maintenance': "Lanche equilibrado para manter os níveis de energia."
    },
    lunch: {
      'weight_loss': "Almoço rico em proteínas e vegetais, controlado em carboidratos.",
      'muscle_gain': "Almoço rico em proteínas e carboidratos para maximizar os ganhos.",
      'maintenance': "Almoço balanceado com todos os grupos alimentares."
    },
    afternoonSnack: {
      'weight_loss': "Lanche proteico para evitar compulsão no jantar.",
      'muscle_gain': "Lanche pré-treino rico em carboidratos e proteínas.",
      'maintenance': "Lanche nutritivo para manter a energia."
    },
    dinner: {
      'weight_loss': "Jantar leve com foco em proteínas magras e vegetais.",
      'muscle_gain': "Jantar rico em proteínas para recuperação muscular.",
      'maintenance': "Jantar balanceado para finalizar o dia."
    }
  };

  return descriptions[mealType as keyof typeof descriptions][goal as keyof typeof descriptions['breakfast']] || 
         "Refeição balanceada para atender suas necessidades nutricionais.";
};

const getPreparationDetails = (food: Food) => {
  const details = {
    'ovo': 'Preparar com pouco sal e azeite de oliva extra virgem.',
    'pão': 'Preferir versões integrais, pode ser torrado.',
    'arroz': 'Cozinhar al dente com temperos naturais.',
    'feijão': 'Cozinhar com louro e temperos naturais, sem excesso de sal.',
    'frango': 'Grelhar com ervas finas e limão.',
    'peixe': 'Preparar no vapor ou grelhado com ervas.',
    'carne': 'Grelhar ou assar, removendo gorduras visíveis.',
    'batata': 'Cozinhar ou assar com ervas, evitando frituras.',
    'legumes': 'Preparar no vapor para preservar nutrientes.',
    'salada': 'Lavar bem e temperar com azeite e limão.',
    'iogurte': 'Optar por versões sem açúcar, pode adicionar frutas.',
    'aveia': 'Preparar com leite vegetal ou água.',
    'quinoa': 'Cozinhar e temperar com ervas frescas.'
  };

  const defaultDetail = 'Preparar de forma simples, priorizando temperos naturais.';
  
  return Object.entries(details).find(([key]) => 
    food.name.toLowerCase().includes(key)
  )?.[1] || defaultDetail;
};

const formatPortion = (food: Food, baseAmount: number) => {
  const measurementUnits = {
    'arroz': { unit: 'xícara(s)', conversion: 0.5 },
    'feijão': { unit: 'concha(s)', conversion: 0.6 },
    'pão': { unit: 'fatia(s)', conversion: 1 },
    'leite': { unit: 'copo(s)', conversion: 1 },
    'aveia': { unit: 'colher(es) de sopa', conversion: 2 },
    'ovo': { unit: 'unidade(s)', conversion: 1 },
    'fruta': { unit: 'unidade(s)', conversion: 1 },
    'iogurte': { unit: 'pote(s)', conversion: 1 },
    'mel': { unit: 'colher(es) de chá', conversion: 3 },
  };

  const foodKey = Object.keys(measurementUnits).find(key => 
    food.name.toLowerCase().includes(key)
  );

  if (foodKey) {
    const { unit, conversion } = measurementUnits[foodKey as keyof typeof measurementUnits];
    const amount = Math.round(baseAmount * conversion / 100);
    return { amount, unit };
  }

  return { 
    amount: baseAmount, 
    unit: food.portionUnit || 'gramas'
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    console.log('Dados recebidos:', { userData, selectedFoods: selectedFoods.length });

    // Distribuir calorias entre as refeições
    const totalCalories = userData.dailyCalories;
    const mealDistribution = {
      breakfast: 0.25,
      morningSnack: 0.15,
      lunch: 0.30,
      afternoonSnack: 0.10,
      dinner: 0.20
    };

    const mealPlan = {
      dailyPlan: {
        breakfast: {
          description: getMealDescription('breakfast', userData.goal),
          foods: selectedFoods.slice(0, 3).map(food => {
            const portion = formatPortion(food, 100);
            return {
              name: food.name,
              portion: portion.amount,
              unit: portion.unit,
              details: getPreparationDetails(food),
              calories: Math.round(food.calories * portion.amount / 100),
              macros: {
                protein: Math.round(food.protein * portion.amount / 100),
                carbs: Math.round(food.carbs * portion.amount / 100),
                fats: Math.round(food.fats * portion.amount / 100)
              }
            };
          }),
          calories: Math.round(totalCalories * mealDistribution.breakfast),
          macros: {
            protein: 25,
            carbs: 45,
            fats: 15
          }
        },
        morningSnack: {
          description: getMealDescription('morningSnack', userData.goal),
          foods: selectedFoods.slice(3, 4).map(food => {
            const portion = formatPortion(food, 75);
            return {
              name: food.name,
              portion: portion.amount,
              unit: portion.unit,
              details: getPreparationDetails(food),
              calories: Math.round(food.calories * portion.amount / 100),
              macros: {
                protein: Math.round(food.protein * portion.amount / 100),
                carbs: Math.round(food.carbs * portion.amount / 100),
                fats: Math.round(food.fats * portion.amount / 100)
              }
            };
          }),
          calories: Math.round(totalCalories * mealDistribution.morningSnack),
          macros: {
            protein: 15,
            carbs: 25,
            fats: 10
          }
        },
        lunch: {
          description: getMealDescription('lunch', userData.goal),
          foods: selectedFoods.slice(4, 7).map(food => {
            const portion = formatPortion(food, 150);
            return {
              name: food.name,
              portion: portion.amount,
              unit: portion.unit,
              details: getPreparationDetails(food),
              calories: Math.round(food.calories * portion.amount / 100),
              macros: {
                protein: Math.round(food.protein * portion.amount / 100),
                carbs: Math.round(food.carbs * portion.amount / 100),
                fats: Math.round(food.fats * portion.amount / 100)
              }
            };
          }),
          calories: Math.round(totalCalories * mealDistribution.lunch),
          macros: {
            protein: 40,
            carbs: 50,
            fats: 15
          }
        },
        afternoonSnack: {
          description: getMealDescription('afternoonSnack', userData.goal),
          foods: selectedFoods.slice(7, 8).map(food => {
            const portion = formatPortion(food, 75);
            return {
              name: food.name,
              portion: portion.amount,
              unit: portion.unit,
              details: getPreparationDetails(food),
              calories: Math.round(food.calories * portion.amount / 100),
              macros: {
                protein: Math.round(food.protein * portion.amount / 100),
                carbs: Math.round(food.carbs * portion.amount / 100),
                fats: Math.round(food.fats * portion.amount / 100)
              }
            };
          }),
          calories: Math.round(totalCalories * mealDistribution.afternoonSnack),
          macros: {
            protein: 15,
            carbs: 20,
            fats: 5
          }
        },
        dinner: {
          description: getMealDescription('dinner', userData.goal),
          foods: selectedFoods.slice(8, 10).map(food => {
            const portion = formatPortion(food, 125);
            return {
              name: food.name,
              portion: portion.amount,
              unit: portion.unit,
              details: getPreparationDetails(food),
              calories: Math.round(food.calories * portion.amount / 100),
              macros: {
                protein: Math.round(food.protein * portion.amount / 100),
                carbs: Math.round(food.carbs * portion.amount / 100),
                fats: Math.round(food.fats * portion.amount / 100)
              }
            };
          }),
          calories: Math.round(totalCalories * mealDistribution.dinner),
          macros: {
            protein: 35,
            carbs: 30,
            fats: 15
          }
        }
      },
      totalNutrition: {
        calories: totalCalories,
        protein: 130,
        carbs: 170,
        fats: 60
      },
      recommendations: {
        general: `Este plano alimentar foi personalizado para seu objetivo de ${
          userData.goal === 'weight_loss' ? 'perda de peso' :
          userData.goal === 'muscle_gain' ? 'ganho de massa muscular' :
          'manutenção do peso'
        }. As refeições foram distribuídas de forma a otimizar seus resultados, mantendo um bom aporte de nutrientes ao longo do dia.`,
        timing: [
          "Café da manhã: 7:00 - 8:30",
          "Lanche da manhã: 10:00 - 10:30",
          "Almoço: 12:30 - 13:30",
          "Lanche da tarde: 15:30 - 16:30",
          "Jantar: 19:00 - 20:30"
        ],
        hydration: "Beba água regularmente entre as refeições. Meta diária: 35ml por kg de peso corporal.",
        preparation: [
          "Prepare as refeições com antecedência para manter a consistência",
          "Use temperos naturais e ervas frescas",
          "Evite frituras, prefira preparações grelhadas, assadas ou cozidas",
          "Mantenha os horários das refeições o mais regular possível"
        ]
      }
    };

    // Ajustar recomendações com base no horário de treino
    if (dietaryPreferences.trainingTime) {
      const trainingTime = new Date(`1970-01-01T${dietaryPreferences.trainingTime}`);
      const hour = trainingTime.getHours();
      
      mealPlan.recommendations.timing = [
        "Café da manhã: 7:00 - 8:30",
        "Lanche da manhã: 10:00 - 10:30",
        "Almoço: 12:00 - 13:00",
        `Pré-treino: ${hour - 1}:30 - ${hour - 0.5}:00`,
        `Pós-treino: ${hour + 0.5}:00 - ${hour + 1}:00`,
        "Jantar: 20:00 - 21:00"
      ];

      mealPlan.recommendations.preworkout = "Consuma carboidratos complexos e proteínas de fácil digestão 1.5-2 horas antes do treino. Evite alimentos muito gordurosos neste momento.";
      mealPlan.recommendations.postworkout = "Priorize proteínas de alta qualidade e carboidratos de rápida absorção em até 1 hora após o treino para otimizar a recuperação muscular.";
    }

    console.log('Plano alimentar detalhado gerado com sucesso');

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Erro na função generate-meal-plan:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno ao gerar plano alimentar'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
