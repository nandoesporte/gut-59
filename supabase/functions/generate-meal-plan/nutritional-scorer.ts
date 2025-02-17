
import type { Food } from './types';

export function calculateNutritionalScore(
  food: Food,
  goal: string,
  userPreferences: {
    likedFoods?: string[];
    dislikedFoods?: string[];
  }
): number {
  let score = 0;

  // Base nutritional value score
  if (food.protein) score += 2;
  if (food.fiber) score += 1;
  if (food.vitamins) score += Object.keys(food.vitamins).length * 0.2;
  if (food.minerals) score += Object.keys(food.minerals).length * 0.2;

  // Goal-specific scoring
  switch (goal) {
    case 'lose_weight':
      if (food.fiber > 3) score += 2;
      if (food.glycemic_index && food.glycemic_index < 55) score += 2;
      if (food.protein / food.calories > 0.1) score += 2; // High protein density
      break;
    case 'gain_mass':
      if (food.calories > 200) score += 1;
      if (food.protein > 20) score += 2;
      if (food.carbs / food.calories > 0.5) score += 1;
      break;
    case 'maintain':
      if (food.fiber > 2) score += 1;
      if (food.protein / food.calories > 0.15) score += 1;
      break;
  }

  // Category-based scoring
  if (food.nutritional_category) {
    if (food.nutritional_category.includes('vegetables')) score += 1;
    if (food.nutritional_category.includes('protein')) score += 1;
    if (food.nutritional_category.includes('healthy_fats')) score += 1;
    if (food.nutritional_category.includes('carbs_complex')) score += 1;
  }

  // User preferences
  if (userPreferences.likedFoods?.includes(food.id)) score += 2;
  if (userPreferences.dislikedFoods?.includes(food.id)) score -= 3;

  return score;
}
