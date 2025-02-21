import type { MacroTargets } from './types.ts';

export function calculateHarrisBenedict(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityFactor: number
): number {
  let bmr;
  if (gender === 'male') {
    bmr = 66 + (13.7 * weight) + (5 * height) - (6.8 * age);
  } else {
    bmr = 655 + (9.6 * weight) + (1.8 * height) - (4.7 * age);
  }
  return Math.round(bmr * activityFactor);
}

export function calculateMifflinStJeor(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityFactor: number
): number {
  let bmr;
  if (gender === 'male') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
  return Math.round(bmr * activityFactor);
}

export function adjustCaloriesForGoal(baseCalories: number, goal: string): number {
  switch (goal) {
    case 'lose':
      return baseCalories - 500; // Déficit calórico para perda
    case 'gain':
      return baseCalories + 500; // Superávit calórico para ganho
    default:
      return baseCalories; // Manutenção
  }
}

export function calculateMacroDistribution(calories: number, goal: string, weight: number) {
  // Proteína baseada no peso corporal
  const proteinPerKg = {
    lose: 2.2,    // Maior proteína para preservar massa
    maintain: 1.8,
    gain: 2.0     // Alto para suporte ao ganho muscular
  };

  const baseProtein = Math.round(weight * (proteinPerKg[goal as keyof typeof proteinPerKg] || 1.8));
  const proteinCalories = baseProtein * 4;
  
  let carbsPercentage, fatsPercentage;
  
  switch (goal) {
    case 'lose':
      carbsPercentage = 0.40; // 40% carbs
      fatsPercentage = 0.25;  // 25% gorduras
      break;
    case 'gain':
      carbsPercentage = 0.50; // 50% carbs
      fatsPercentage = 0.20;  // 20% gorduras
      break;
    default:
      carbsPercentage = 0.45; // 45% carbs
      fatsPercentage = 0.25;  // 25% gorduras
  }

  const remainingCalories = calories - proteinCalories;
  const carbCalories = Math.round(calories * carbsPercentage);
  const fatCalories = Math.round(calories * fatsPercentage);

  return {
    protein: baseProtein,
    carbs: Math.round(carbCalories / 4),
    fats: Math.round(fatCalories / 9),
    fiber: Math.round(calories / 1000 * 14) // 14g de fibra por 1000kcal
  };
}

export function calculatePortion(
  food: Food,
  targetCalories: number,
  macroTargets: MacroTargets
): FoodWithPortion {
  const caloriesPerGram = food.calories / food.serving_size;
  let portion = (targetCalories / caloriesPerGram);

  // Ajustar porção baseado nos macros
  if (food.protein) {
    const proteinPortion = (macroTargets.protein / food.protein) * food.serving_size;
    portion = Math.min(portion, proteinPortion);
  }
  
  if (food.carbs) {
    const carbsPortion = (macroTargets.carbs / food.carbs) * food.serving_size;
    portion = Math.min(portion, carbsPortion);
  }

  portion = Math.round(portion);

  return {
    ...food,
    portion,
    portionUnit: food.serving_unit,
    calculatedNutrients: {
      calories: Math.round((food.calories / food.serving_size) * portion),
      protein: Math.round((food.protein / food.serving_size) * portion),
      carbs: Math.round((food.carbs / food.serving_size) * portion),
      fats: Math.round((food.fats / food.serving_size) * portion),
      fiber: Math.round((food.fiber / food.serving_size) * portion)
    }
  };
}

export function validateNutrition(
  foods: FoodWithPortion[],
  macroTargets: MacroTargets
): boolean {
  const totals = foods.reduce(
    (acc, food) => ({
      calories: acc.calories + food.calculatedNutrients.calories,
      protein: acc.protein + food.calculatedNutrients.protein,
      carbs: acc.carbs + food.calculatedNutrients.carbs,
      fats: acc.fats + food.calculatedNutrients.fats,
      fiber: acc.fiber + food.calculatedNutrients.fiber
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
  );

  const tolerancePercentage = 0.1; // 10% de tolerância

  return (
    Math.abs(totals.protein - macroTargets.protein) / macroTargets.protein <= tolerancePercentage &&
    Math.abs(totals.carbs - macroTargets.carbs) / macroTargets.carbs <= tolerancePercentage &&
    Math.abs(totals.fats - macroTargets.fats) / macroTargets.fats <= tolerancePercentage &&
    totals.fiber >= macroTargets.fiber
  );
}
