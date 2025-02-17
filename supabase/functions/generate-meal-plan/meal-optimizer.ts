
import type { Food, MacroTargets, FoodWithPortion, WeeklyPlan } from './types';
import { calculatePortionSize } from './portion-calculator';
import { calculateNutritionalScore } from './nutritional-scorer';
import { analyzeMeal } from './meal-analyzer';

interface MealGuideline {
  min_items: number;
  required_categories: string[];
  description: string;
}

const defaultGuidelines: Record<string, MealGuideline> = {
  breakfast: {
    min_items: 3,
    required_categories: ['carbs_complex', 'protein', 'healthy_fats'],
    description: 'Café da manhã deve incluir carboidratos complexos, proteína e gorduras saudáveis'
  },
  morning_snack: {
    min_items: 2,
    required_categories: ['protein_or_fats', 'carbs_or_fiber'],
    description: 'Lanche deve incluir proteína ou gordura saudável e carboidratos ou fibras'
  },
  lunch: {
    min_items: 4,
    required_categories: ['carbs_complex', 'protein', 'vegetables', 'healthy_fats'],
    description: 'Almoço deve incluir carboidratos complexos, proteína, vegetais e gorduras saudáveis'
  },
  afternoon_snack: {
    min_items: 2,
    required_categories: ['protein_or_fats', 'carbs_or_fiber'],
    description: 'Lanche deve incluir proteína ou gordura saudável e carboidratos ou fibras'
  },
  dinner: {
    min_items: 4,
    required_categories: ['carbs_complex', 'protein', 'vegetables', 'healthy_fats'],
    description: 'Jantar deve incluir carboidratos complexos, proteína, vegetais e gorduras saudáveis'
  }
};

export function optimizeMealCombinations(
  foods: Food[],
  targetCalories: number,
  macroTargets: MacroTargets,
  goal: string,
  userPreferences: {
    likedFoods?: string[];
    dislikedFoods?: string[];
  },
  mealType: string
): FoodWithPortion[] {
  const requirements = {
    targetCalories,
    macroTargets,
    mealGuidelines: defaultGuidelines
  };

  const { foods: selectedFoods, meetsGuidelines, suggestions } = analyzeMeal(
    foods,
    requirements,
    mealType
  );

  if (!meetsGuidelines && suggestions) {
    console.log(`Meal optimization suggestions for ${mealType}:`, suggestions);
  }

  return selectedFoods;
}

export function generateWeeklyPlan(
  availableFoods: Food[],
  dailyCalories: number,
  macroTargets: MacroTargets,
  goal: string,
  userPreferences: {
    likedFoods?: string[];
    dislikedFoods?: string[];
  }
): WeeklyPlan {
  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weeklyPlan: WeeklyPlan = {};

  for (const day of weekDays) {
    const breakfastFoods = availableFoods.filter(f => 
      f.meal_type?.includes('breakfast') || f.meal_type?.includes('any')
    );
    const snackFoods = availableFoods.filter(f => 
      f.meal_type?.includes('snack') || f.meal_type?.includes('any')
    );
    const lunchDinnerFoods = availableFoods.filter(f => 
      f.meal_type?.includes('lunch') || f.meal_type?.includes('dinner') || f.meal_type?.includes('any')
    );

    weeklyPlan[day] = {
      breakfast: optimizeMealCombinations(
        breakfastFoods,
        dailyCalories * 0.25,
        macroTargets,
        goal,
        userPreferences,
        'breakfast'
      ),
      morningSnack: optimizeMealCombinations(
        snackFoods,
        dailyCalories * 0.1,
        macroTargets,
        goal,
        userPreferences,
        'morning_snack'
      ),
      lunch: optimizeMealCombinations(
        lunchDinnerFoods,
        dailyCalories * 0.3,
        macroTargets,
        goal,
        userPreferences,
        'lunch'
      ),
      afternoonSnack: optimizeMealCombinations(
        snackFoods,
        dailyCalories * 0.1,
        macroTargets,
        goal,
        userPreferences,
        'afternoon_snack'
      ),
      dinner: optimizeMealCombinations(
        lunchDinnerFoods,
        dailyCalories * 0.25,
        macroTargets,
        goal,
        userPreferences,
        'dinner'
      )
    };
  }

  return weeklyPlan;
}
