import type { Food, MacroTargets, FoodWithPortion, Meal } from './types.ts';
import { calculatePortionSize } from './portion-calculator.ts';

interface MealGuideline {
  min_items: number;
  max_items: number;
  min_calories: number;
  max_calories: number;
  protein_ratio: number;
  carbs_ratio: number;
  fats_ratio: number;
}

const MEAL_GUIDELINES: { [key: string]: MealGuideline } = {
  breakfast: {
    min_items: 3,
    max_items: 5,
    min_calories: 300,
    max_calories: 500,
    protein_ratio: 0.25,
    carbs_ratio: 0.5,
    fats_ratio: 0.25
  },
  morningSnack: {
    min_items: 1,
    max_items: 2,
    min_calories: 100,
    max_calories: 200,
    protein_ratio: 0.1,
    carbs_ratio: 0.6,
    fats_ratio: 0.3
  },
  lunch: {
    min_items: 3,
    max_items: 5,
    min_calories: 500,
    max_calories: 700,
    protein_ratio: 0.3,
    carbs_ratio: 0.4,
    fats_ratio: 0.3
  },
  afternoonSnack: {
    min_items: 1,
    max_items: 2,
    min_calories: 100,
    max_calories: 200,
    protein_ratio: 0.1,
    carbs_ratio: 0.6,
    fats_ratio: 0.3
  },
  dinner: {
    min_items: 3,
    max_items: 5,
    min_calories: 400,
    max_calories: 600,
    protein_ratio: 0.3,
    carbs_ratio: 0.4,
    fats_ratio: 0.3
  }
};

export function analyzeMealPlan(dailyPlan: { [key: string]: Meal | undefined }): string[] {
  const analysis: string[] = [];
  
  Object.entries(dailyPlan).forEach(([mealType, meal]) => {
    if (!meal) return;
    
    const guidelines = MEAL_GUIDELINES[mealType];
    if (!guidelines) return;

    // Analyze number of items
    if (meal.foods.length < guidelines.min_items) {
      analysis.push(`${mealType}: Poucos itens na refeição`);
    }
    if (meal.foods.length > guidelines.max_items) {
      analysis.push(`${mealType}: Muitos itens na refeição`);
    }

    // Analyze calories
    if (meal.calories < guidelines.min_calories) {
      analysis.push(`${mealType}: Calorias abaixo do recomendado`);
    }
    if (meal.calories > guidelines.max_calories) {
      analysis.push(`${mealType}: Calorias acima do recomendado`);
    }

    // Analyze macro ratios
    const totalMacros = meal.macros.protein + meal.macros.carbs + meal.macros.fats;
    const proteinRatio = meal.macros.protein / totalMacros;
    const carbsRatio = meal.macros.carbs / totalMacros;
    const fatsRatio = meal.macros.fats / totalMacros;

    if (Math.abs(proteinRatio - guidelines.protein_ratio) > 0.1) {
      analysis.push(`${mealType}: Proporção de proteínas fora do ideal`);
    }
    if (Math.abs(carbsRatio - guidelines.carbs_ratio) > 0.1) {
      analysis.push(`${mealType}: Proporção de carboidratos fora do ideal`);
    }
    if (Math.abs(fatsRatio - guidelines.fats_ratio) > 0.1) {
      analysis.push(`${mealType}: Proporção de gorduras fora do ideal`);
    }
  });

  return analysis;
}
