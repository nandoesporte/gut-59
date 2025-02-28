
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tipos de dados da API Nutritionix
export interface NutritionixFood {
  food_name: string;
  serving_qty: number;
  serving_unit: string;
  serving_weight_grams: number;
  nf_calories: number;
  nf_total_fat: number;
  nf_saturated_fat?: number;
  nf_cholesterol?: number;
  nf_sodium?: number;
  nf_total_carbohydrate: number;
  nf_dietary_fiber?: number;
  nf_sugars?: number;
  nf_protein: number;
  nf_potassium?: number;
  photo?: {
    thumb: string;
    highres: string;
  };
  alt_measures?: Array<{
    serving_weight: number;
    measure: string;
    seq: number;
  }>;
}

export interface NutritionixSearchResponse {
  foods: NutritionixFood[];
}

/**
 * Busca informações nutricionais de um alimento usando a API Nutritionix via edge function
 */
export const searchFoodNutrition = async (query: string): Promise<NutritionixFood[]> => {
  try {
    console.log(`[NUTRITIONIX] Buscando informações para: ${query}`);
    
    const { data, error } = await supabase.functions.invoke('nutritionix-search', {
      body: { query }
    });
    
    if (error) {
      console.error('[NUTRITIONIX] Erro na chamada à edge function:', error);
      throw new Error(`Erro ao buscar dados nutricionais: ${error.message}`);
    }
    
    if (!data || !data.foods || !Array.isArray(data.foods)) {
      console.error('[NUTRITIONIX] Resposta inválida:', data);
      throw new Error('Formato de resposta inválido da API Nutritionix');
    }
    
    console.log(`[NUTRITIONIX] Encontrados ${data.foods.length} resultados para "${query}"`);
    return data.foods;
  } catch (error) {
    console.error('[NUTRITIONIX] Erro ao buscar informações nutricionais:', error);
    toast.error('Não foi possível obter informações nutricionais precisas');
    return [];
  }
};

/**
 * Converte um alimento da API Nutritionix para o formato usado no protocolo
 */
export const convertNutritionixToProtocolFood = (nutritionixFood: NutritionixFood) => {
  return {
    id: `nutritionix-${nutritionixFood.food_name.replace(/\s+/g, '-')}`,
    name: nutritionixFood.food_name,
    calories: Math.round(nutritionixFood.nf_calories),
    protein: Math.round(nutritionixFood.nf_protein),
    carbs: Math.round(nutritionixFood.nf_total_carbohydrate),
    fats: Math.round(nutritionixFood.nf_total_fat),
    fiber: nutritionixFood.nf_dietary_fiber ? Math.round(nutritionixFood.nf_dietary_fiber) : 0,
    portion: nutritionixFood.serving_weight_grams,
    portionUnit: 'g',
    // Atribuir grupo alimentar baseado em macronutrientes
    food_group_id: getFoodGroupId(nutritionixFood)
  };
};

/**
 * Determina o grupo alimentar baseado na composição de macronutrientes
 */
const getFoodGroupId = (food: NutritionixFood): number => {
  const totalCals = food.nf_calories || 1;
  const proteinRatio = (food.nf_protein * 4) / totalCals;
  const carbRatio = (food.nf_total_carbohydrate * 4) / totalCals;
  const fatRatio = (food.nf_total_fat * 9) / totalCals;
  
  // Frutas e verduras geralmente têm mais fibras
  if (food.nf_dietary_fiber && (food.nf_dietary_fiber / food.nf_total_carbohydrate) > 0.3) {
    if (food.nf_sugars && (food.nf_sugars / food.nf_total_carbohydrate) > 0.5) {
      return 2; // Frutas
    }
    return 1; // Verduras e Legumes
  }
  
  // Proteínas animais vs vegetais
  if (proteinRatio > 0.3) {
    // Isso é uma simplificação - idealmente teríamos mais dados para diferenciar
    const isLikelyDairy = food.food_name.includes('milk') || 
                         food.food_name.includes('cheese') || 
                         food.food_name.includes('yogurt');
    
    if (isLikelyDairy) {
      return 6; // Laticínios
    }
    
    const isLikelyPlantBased = food.food_name.includes('tofu') || 
                              food.food_name.includes('beans') || 
                              food.food_name.includes('lentil');
    
    return isLikelyPlantBased ? 5 : 4; // Proteínas Vegetais ou Animais
  }
  
  // Grãos e Cereais vs Gorduras
  if (carbRatio > 0.5) {
    return 3; // Grãos e Cereais
  }
  
  if (fatRatio > 0.5) {
    return 7; // Gorduras
  }
  
  // Default para outros
  return 10;
};

/**
 * Agrupa alimentos por refeição, evitando misturas inadequadas
 */
export const groupFoodsByMeal = (foods: any[]) => {
  return {
    breakfast: foods.filter(food => [1, 2, 3, 6].includes(food.food_group_id)), // Frutas, cereais, lácteos
    lunch: foods.filter(food => [1, 3, 4, 5].includes(food.food_group_id)), // Verduras, proteínas, grãos
    snacks: foods.filter(food => [2, 6, 7].includes(food.food_group_id)), // Frutas, lácteos, nuts
    dinner: foods.filter(food => [1, 3, 4, 5].includes(food.food_group_id))  // Similar ao almoço mas pode ter menos carbs
  };
};
