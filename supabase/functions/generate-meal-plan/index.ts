
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface MacroNutrients {
  carbs: number;
  protein: number;
  fats: number;
}

interface Food {
  name: string;
  portion: number;
  calories: number;
  macros: MacroNutrients;
}

interface Meal {
  calories: number;
  foods: Food[];
}

interface MealPlan {
  totalCalories: number;
  meals: {
    [key: string]: Meal;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();
    const {
      weight,
      height,
      age,
      gender,
      activityLevel,
      goal
    } = preferences;

    // Calcular TMB usando a fórmula de Mifflin-St Jeor
    let tmb = 10 * weight + 6.25 * height - 5 * age;
    tmb = gender === 'male' ? tmb + 5 : tmb - 161;

    // Ajustar com base no nível de atividade
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      intense: 1.725,
    };

    let totalCalories = Math.round(tmb * activityMultipliers[activityLevel]);

    // Ajustar com base no objetivo
    switch (goal) {
      case 'lose':
        totalCalories -= 500;
        break;
      case 'gain':
        totalCalories += 500;
        break;
    }

    // Distribuir calorias entre as refeições
    const mealPlan: MealPlan = {
      totalCalories,
      meals: {
        "café da manhã": {
          calories: Math.round(totalCalories * 0.2),
          foods: [
            {
              name: "Aveia em flocos",
              portion: 40,
              calories: 150,
              macros: { carbs: 27, protein: 5, fats: 3 }
            },
            {
              name: "Banana",
              portion: 100,
              calories: 89,
              macros: { carbs: 23, protein: 1.1, fats: 0.3 }
            }
          ]
        },
        "lanche da manhã": {
          calories: Math.round(totalCalories * 0.1),
          foods: [
            {
              name: "Maçã",
              portion: 100,
              calories: 52,
              macros: { carbs: 14, protein: 0.3, fats: 0.2 }
            }
          ]
        },
        "almoço": {
          calories: Math.round(totalCalories * 0.3),
          foods: [
            {
              name: "Arroz integral",
              portion: 100,
              calories: 111,
              macros: { carbs: 23, protein: 2.6, fats: 0.9 }
            },
            {
              name: "Peito de frango grelhado",
              portion: 100,
              calories: 165,
              macros: { carbs: 0, protein: 31, fats: 3.6 }
            }
          ]
        },
        "lanche da tarde": {
          calories: Math.round(totalCalories * 0.1),
          foods: [
            {
              name: "Iogurte natural",
              portion: 170,
              calories: 100,
              macros: { carbs: 12, protein: 9, fats: 2.5 }
            }
          ]
        },
        "jantar": {
          calories: Math.round(totalCalories * 0.3),
          foods: [
            {
              name: "Batata doce",
              portion: 100,
              calories: 86,
              macros: { carbs: 20, protein: 1.6, fats: 0.1 }
            },
            {
              name: "Atum em conserva",
              portion: 100,
              calories: 128,
              macros: { carbs: 0, protein: 29, fats: 1.3 }
            }
          ]
        }
      }
    };

    // Salvar o plano no banco de dados
    const { error } = await fetch(
      Deno.env.get('SUPABASE_URL') + '/rest/v1/nutrition_plans',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          user_id: userId,
          caloric_needs: totalCalories,
          meal_plan: mealPlan
        })
      }
    ).then(res => res.json());

    if (error) throw error;

    return new Response(
      JSON.stringify(mealPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
