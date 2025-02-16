
import type { Food, MacroTargets } from './types.ts';
import { calculatePortions } from './calculators.ts';

export function analyzeWorkoutCompatibility(
  foods: Food[],
  trainingTime: string | null,
  isPreWorkout: boolean
): Food[] {
  if (!trainingTime) return foods;

  return foods.filter(food => {
    if (isPreWorkout) {
      return food.pre_workout_compatible && 
             (food.preparation_time_minutes <= 30) && 
             (food.glycemic_index ? food.glycemic_index > 55 : true);
    } else {
      return food.post_workout_compatible;
    }
  });
}

export function calculateNutritionalScore(food: Food, goal: string): number {
  let score = 0;
  
  // Pontuação base por macronutrientes
  if (food.protein) score += (goal === 'gain' ? 3 : 2);
  if (food.fiber) score += 1;
  if (food.vitamins) score += Object.keys(food.vitamins).length * 0.5;
  if (food.minerals) score += Object.keys(food.minerals).length * 0.5;
  
  // Pontuação específica por objetivo
  switch (goal) {
    case 'lose':
      if (food.fiber > 3) score += 2;
      if (food.glycemic_index && food.glycemic_index < 55) score += 2;
      if (food.protein / food.calories > 0.1) score += 2; // Densidade proteica
      break;
    case 'gain':
      if (food.calories > 200) score += 1;
      if (food.protein > 20) score += 2;
      if (food.carbs / food.calories > 0.5) score += 1; // Alta em carboidratos
      break;
    default: // maintain
      if (food.fiber > 2) score += 1;
      if (food.protein / food.calories > 0.15) score += 1;
      score += 1; // Balanceado
  }

  // Bônus para alimentos rápidos quando aplicável
  if (food.is_quick_meal) score += 0.5;

  return score;
}

export function optimizeMealCombinations(
  foods: Food[],
  targetCalories: number,
  macroTargets: MacroTargets,
  goal: string
): Food[] {
  const combinations: Food[][] = [];
  const maxFoods = 4;

  // Ordenar alimentos por score nutricional
  const scoredFoods = foods.map(food => ({
    ...food,
    nutritionalScore: calculateNutritionalScore(food, goal),
    recommendedPortion: calculatePortions(food, targetCalories, macroTargets)
  })).sort((a, b) => b.nutritionalScore - a.nutritionalScore);

  // Selecionar melhores combinações
  for (let i = 0; i < Math.min(maxFoods, scoredFoods.length); i++) {
    const mainFood = scoredFoods[i];
    const complementaryFoods = scoredFoods
      .filter(f => f.id !== mainFood.id)
      .slice(0, maxFoods - 1);

    // Ajustar porções para atingir alvos de macros
    const selectedFoods = [mainFood, ...complementaryFoods].map(food => ({
      ...food,
      serving_size: food.recommendedPortion
    }));

    combinations.push(selectedFoods);
  }

  return combinations[0] || [];
}
