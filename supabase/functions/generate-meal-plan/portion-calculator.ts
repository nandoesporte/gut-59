
import type { Food, MacroTargets } from './types.ts';

export function calculatePortionSize(
  food: Food,
  targetMacros: MacroTargets,
  mealType: string
): number {
  // Base portion em gramas
  let basePortion = 100;

  // Ajusta a porção com base no tipo de refeição
  switch (mealType) {
    case 'breakfast':
      basePortion = 50;
      break;
    case 'lunch':
    case 'dinner':
      basePortion = 150;
      break;
    case 'morningSnack':
    case 'afternoonSnack':
      basePortion = 30;
      break;
    default:
      basePortion = 100;
  }

  // Ajusta a porção com base nas metas de macronutrientes
  const proteinRatio = food.protein ? (targetMacros.protein / food.protein) : 1;
  const carbsRatio = food.carbs ? (targetMacros.carbs / food.carbs) : 1;
  const fatsRatio = food.fats ? (targetMacros.fats / food.fats) : 1;

  // Média ponderada dos ratios
  const weightedRatio = (proteinRatio * 0.4 + carbsRatio * 0.4 + fatsRatio * 0.2);
  
  // Ajusta a porção final
  const calculatedPortion = basePortion * weightedRatio;

  // Limita a porção a um intervalo razoável
  const minPortion = basePortion * 0.5;
  const maxPortion = basePortion * 2;
  
  return Math.min(Math.max(calculatedPortion, minPortion), maxPortion);
}
