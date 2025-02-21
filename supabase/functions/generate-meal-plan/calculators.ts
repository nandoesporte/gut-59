
import type { MacroTargets } from './types.ts';

export function calculateHarrisBenedict(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityLevel: string
): number {
  // Cálculo do BMR (Basal Metabolic Rate)
  let bmr;
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  // Multiplicador de atividade
  const activityMultipliers: { [key: string]: number } = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  const multiplier = activityMultipliers[activityLevel] || 1.2;
  return Math.round(bmr * multiplier);
}

export function calculateDailyMacros(calories: number, goal: string): MacroTargets {
  let proteinRatio, carbsRatio, fatsRatio;

  switch (goal) {
    case 'lose_weight':
      proteinRatio = 0.35;
      carbsRatio = 0.4;
      fatsRatio = 0.25;
      break;
    case 'gain_muscle':
      proteinRatio = 0.3;
      carbsRatio = 0.5;
      fatsRatio = 0.2;
      break;
    case 'maintain':
    default:
      proteinRatio = 0.3;
      carbsRatio = 0.45;
      fatsRatio = 0.25;
  }

  // Calorias por grama: Proteína = 4, Carboidratos = 4, Gorduras = 9
  return {
    protein: Math.round((calories * proteinRatio) / 4),
    carbs: Math.round((calories * carbsRatio) / 4),
    fats: Math.round((calories * fatsRatio) / 9)
  };
}
