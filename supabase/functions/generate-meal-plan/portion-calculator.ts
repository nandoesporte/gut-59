
import type { Food, MacroTargets, FoodWithPortion } from './types.ts';

export function calculatePortionSize(
  food: Food,
  targetCalories: number,
  macroTargets: MacroTargets
): FoodWithPortion {
  const caloriesPerGram = food.calories / food.serving_size;
  let targetPortion = Math.round((targetCalories / caloriesPerGram) * 100) / 100;

  let portionUnit = food.serving_unit;
  let friendlyPortion = targetPortion;

  if (food.serving_unit === 'g' || food.serving_unit === 'ml') {
    if (food.name.includes('pão')) {
      portionUnit = 'fatia';
      friendlyPortion = Math.round(targetPortion / 30);
    } else if (food.name.includes('arroz') || food.name.includes('quinoa')) {
      portionUnit = 'xícara';
      friendlyPortion = Math.round((targetPortion / 100) * 10) / 10;
    } else if (food.name.includes('azeite') || food.name.includes('manteiga')) {
      portionUnit = 'colher de sopa';
      friendlyPortion = Math.round((targetPortion / 15) * 10) / 10;
    } else if (food.name.includes('granola')) {
      portionUnit = 'colher de sopa';
      friendlyPortion = Math.round(targetPortion / 15);
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
