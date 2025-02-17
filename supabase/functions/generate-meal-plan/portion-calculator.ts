
import type { Food, MacroTargets, FoodWithPortion } from './types';

const STANDARD_PORTIONS = {
  'pão': {
    unit: 'fatia',
    grams: 30
  },
  'arroz': {
    unit: 'xícara',
    grams: 100
  },
  'azeite': {
    unit: 'colher de sopa',
    grams: 15
  },
  'granola': {
    unit: 'colher de sopa',
    grams: 15
  },
  'quinoa': {
    unit: 'xícara',
    grams: 100
  },
  'feijão': {
    unit: 'xícara',
    grams: 100
  },
  'grão-de-bico': {
    unit: 'xícara',
    grams: 100
  },
  'legumes': {
    unit: 'xícara',
    grams: 100
  },
  'verduras': {
    unit: 'xícara',
    grams: 50
  },
  'frutas': {
    unit: 'unidade',
    grams: 100
  },
  'iogurte': {
    unit: 'unidade',
    grams: 170
  }
};

export function calculatePortionSize(
  food: Food,
  targetCalories: number,
  macroTargets: MacroTargets
): FoodWithPortion {
  const caloriesPerGram = food.calories / food.serving_size;
  let targetPortion = Math.round((targetCalories / caloriesPerGram) * 100) / 100;

  let portionUnit = food.serving_unit;
  let friendlyPortion = targetPortion;

  // Encontra a unidade de medida mais apropriada
  for (const [keyword, standard] of Object.entries(STANDARD_PORTIONS)) {
    if (food.name.toLowerCase().includes(keyword)) {
      portionUnit = standard.unit;
      friendlyPortion = Math.round((targetPortion / standard.grams) * 10) / 10;
      break;
    }
  }

  const calculatedCalories = Math.round((food.calories / food.serving_size) * targetPortion);
  const calculatedProtein = Math.round((food.protein / food.serving_size) * targetPortion * 10) / 10;
  const calculatedCarbs = Math.round((food.carbs / food.serving_size) * targetPortion * 10) / 10;
  const calculatedFats = Math.round((food.fats / food.serving_size) * targetPortion * 10) / 10;
  const calculatedFiber = Math.round((food.fiber / food.serving_size) * targetPortion * 10) / 10;

  return {
    ...food,
    portion: friendlyPortion,
    portionUnit,
    calculatedNutrients: {
      calories: calculatedCalories,
      protein: calculatedProtein,
      carbs: calculatedCarbs,
      fats: calculatedFats,
      fiber: calculatedFiber
    }
  };
}
