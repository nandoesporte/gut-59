
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    console.log('Dados recebidos:', { userData, selectedFoods: selectedFoods.length });

    // Criar porções e medidas mais precisas
    const formatPortion = (food: any, baseAmount: number) => {
      const units = {
        arroz: "xícara(s)",
        feijao: "concha(s)",
        pao: "fatia(s)",
        leite: "copo(s)",
        aveia: "colher(es) de sopa",
        fruta: "unidade(s)",
        ovo: "unidade(s)",
        carne: "gramas",
        frango: "gramas",
        peixe: "gramas",
        verdura: "xícara(s)",
        legume: "xícara(s)",
      };

      const defaultUnit = food.portionUnit || "gramas";
      const amount = Math.round(baseAmount * (food.portion || 100) / 100);
      
      // Usar unidades específicas se disponíveis, caso contrário usar a unidade padrão
      const unit = Object.entries(units).find(([key]) => 
        food.name.toLowerCase().includes(key)
      )?.[1] || defaultUnit;

      return `${amount}${unit}`;
    };

    // Gerar descrições mais detalhadas
    const generateDescription = (foods: any[], mealType: string) => {
      const tips = {
        breakfast: [
          "Comece o dia com uma refeição nutritiva e equilibrada",
          "Inclua proteínas para maior saciedade",
          "Adicione frutas para vitaminas e minerais essenciais"
        ],
        morningSnack: [
          "Mantenha a energia entre as refeições principais",
          "Opte por opções leves e nutritivas",
          "Combine carboidratos e proteínas"
        ],
        lunch: [
          "Equilibre proteínas, carboidratos e vegetais",
          "Mastige bem os alimentos",
          "Faça um prato colorido"
        ],
        afternoonSnack: [
          "Evite ficar muito tempo sem comer",
          "Escolha opções que forneçam energia sustentável",
          "Mantenha porções moderadas"
        ],
        dinner: [
          "Opte por uma refeição mais leve",
          "Evite alimentos muito pesados",
          "Inclua vegetais e proteínas magras"
        ]
      };

      const descriptions = foods.map(food => {
        let prep = "";
        if (food.name.toLowerCase().includes("carne") || food.name.toLowerCase().includes("frango")) {
          prep = "grelhado(a)";
        } else if (food.name.toLowerCase().includes("verdura") || food.name.toLowerCase().includes("legume")) {
          prep = "cozido(a) al dente";
        }
        return `${food.name} ${prep}`.trim();
      });

      const mealTips = tips[mealType as keyof typeof tips] || [];
      return {
        foods: descriptions,
        tips: mealTips[Math.floor(Math.random() * mealTips.length)]
      };
    };

    // Gerar cardápio detalhado
    const mealPlan = {
      dailyPlan: {
        breakfast: {
          foods: selectedFoods.slice(0, 2).map(food => ({
            ...food,
            portion: formatPortion(food, 100),
            preparation: generateDescription([food], "breakfast").foods[0],
            details: "Consumir logo após acordar para um início de dia energético"
          })),
          calories: 400,
          macros: { protein: 20, carbs: 40, fats: 15, fiber: 5 },
          description: generateDescription(selectedFoods.slice(0, 2), "breakfast").tips
        },
        morningSnack: {
          foods: selectedFoods.slice(2, 3).map(food => ({
            ...food,
            portion: formatPortion(food, 75),
            preparation: generateDescription([food], "morningSnack").foods[0],
            details: "Lanche intermediário para manter os níveis de energia"
          })),
          calories: 200,
          macros: { protein: 10, carbs: 25, fats: 8, fiber: 3 },
          description: generateDescription(selectedFoods.slice(2, 3), "morningSnack").tips
        },
        lunch: {
          foods: selectedFoods.slice(3, 5).map(food => ({
            ...food,
            portion: formatPortion(food, 150),
            preparation: generateDescription([food], "lunch").foods[0],
            details: "Refeição principal do dia, rica em nutrientes"
          })),
          calories: 600,
          macros: { protein: 30, carbs: 60, fats: 20, fiber: 8 },
          description: generateDescription(selectedFoods.slice(3, 5), "lunch").tips
        },
        afternoonSnack: {
          foods: selectedFoods.slice(5, 6).map(food => ({
            ...food,
            portion: formatPortion(food, 75),
            preparation: generateDescription([food], "afternoonSnack").foods[0],
            details: "Lanche estratégico para evitar fome excessiva no jantar"
          })),
          calories: 200,
          macros: { protein: 10, carbs: 25, fats: 8, fiber: 3 },
          description: generateDescription(selectedFoods.slice(5, 6), "afternoonSnack").tips
        },
        dinner: {
          foods: selectedFoods.slice(6, 8).map(food => ({
            ...food,
            portion: formatPortion(food, 125),
            preparation: generateDescription([food], "dinner").foods[0],
            details: "Última refeição do dia, mais leve para melhor digestão"
          })),
          calories: 500,
          macros: { protein: 25, carbs: 45, fats: 18, fiber: 6 },
          description: generateDescription(selectedFoods.slice(6, 8), "dinner").tips
        }
      },
      totalNutrition: {
        calories: userData.dailyCalories,
        protein: 95,
        carbs: 195,
        fats: 69,
        fiber: 25
      },
      recommendations: {
        general: [
          "Mantenha uma boa hidratação ao longo do dia",
          "Faça as refeições em horários regulares",
          "Evite distrações durante as refeições",
          "Mastigue bem os alimentos",
          "Priorize alimentos in natura"
        ],
        timing: [
          "Café da manhã: 7:00 - 8:00",
          "Lanche da manhã: 10:00 - 10:30",
          "Almoço: 12:30 - 13:30",
          "Lanche da tarde: 15:30 - 16:00",
          "Jantar: 19:00 - 20:00"
        ],
        preparation: [
          "Prepare as refeições com antecedência quando possível",
          "Mantenha porções controladas usando medidores",
          "Armazene os alimentos adequadamente",
          "Prefira métodos de cocção saudáveis como grelhar e cozinhar",
          "Tempere os alimentos com ervas e especiarias naturais"
        ],
        substitutions: [
          {
            group: "Proteínas",
            options: "Troque entre carnes magras, peixes, ovos e proteínas vegetais"
          },
          {
            group: "Carboidratos",
            options: "Alterne entre arroz integral, quinoa, batata doce e mandioca"
          },
          {
            group: "Vegetais",
            options: "Varie as cores e tipos de vegetais para maior diversidade nutricional"
          }
        ]
      }
    };

    // Ajustar horários com base no treino
    if (dietaryPreferences.trainingTime) {
      const trainingTime = new Date(`1970-01-01T${dietaryPreferences.trainingTime}`);
      const hour = trainingTime.getHours();
      
      mealPlan.recommendations.timing = [
        "Café da manhã: 7:00 - 8:00",
        "Lanche da manhã: 10:00 - 10:30",
        "Almoço: 12:00 - 13:00",
        `Pré-treino: ${hour - 1}:00 - ${hour - 0.5}:00`,
        `Pós-treino: ${hour + 0.5}:00 - ${hour + 1}:00`,
        "Jantar: 20:00 - 21:00"
      ];

      // Adicionar recomendações específicas para treino
      mealPlan.recommendations.preworkout = "Consuma carboidratos de fácil digestão 1-2 horas antes do treino";
      mealPlan.recommendations.postworkout = "Priorize proteínas e carboidratos até 1 hora após o treino";
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
