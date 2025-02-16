
import type { Food } from './types.ts';

export function calculateNutritionalScore(
  food: Food,
  goal: string,
  userPreferences: {
    likedFoods?: string[];
    dislikedFoods?: string[];
  }
): number {
  let score = 0;
  
  if (food.protein) score += (goal === 'gain' ? 3 : 2);
  if (food.fiber) score += 1;
  if (food.vitamins) score += Object.keys(food.vitamins).length * 0.5;
  if (food.minerals) score += Object.keys(food.minerals).length * 0.5;
  
  switch (goal) {
    case 'lose':
      if (food.fiber > 3) score += 2;
      if (food.glycemic_index && food.glycemic_index < 55) score += 2;
      if (food.protein / food.calories > 0.1) score += 2;
      break;
    case 'gain':
      if (food.calories > 200) score += 1;
      if (food.protein > 20) score += 2;
      if (food.carbs / food.calories > 0.5) score += 1;
      break;
    default:
      if (food.fiber > 2) score += 1;
      if (food.protein / food.calories > 0.15) score += 1;
      score += 1;
  }

  if (userPreferences.likedFoods?.includes(food.id)) {
    score += 2;
  }
  if (userPreferences.dislikedFoods?.includes(food.id)) {
    score -= 3;
  }

  return score;
}
