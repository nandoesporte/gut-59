
import type { Food, MacroTargets, FoodWithPortion } from './types.ts';
import { analyzeWorkoutCompatibility } from './workout-analyzer.ts';
import { calculatePortionSize } from './portion-calculator.ts';
import { calculateNutritionalScore } from './nutritional-scorer.ts';

export { analyzeWorkoutCompatibility } from './workout-analyzer.ts';

export function optimizeMealCombinations(
  foods: Food[],
  targetCalories: number,
  macroTargets: MacroTargets,
  goal: string,
  userPreferences: {
    likedFoods?: string[];
    dislikedFoods?: string[];
  }
): FoodWithPortion[] {
  const mealFoods: FoodWithPortion[] = [];
  let remainingCalories = targetCalories;
  const minCaloriesPerFood = 30;

  const scoredFoods = foods
    .map(food => ({
      ...food,
      score: calculateNutritionalScore(food, goal, userPreferences)
    }))
    .sort((a, b) => b.score - a.score);

  for (const food of scoredFoods) {
    if (remainingCalories < minCaloriesPerFood || mealFoods.length >= 5) break;

    let foodCalories = Math.min(
      remainingCalories,
      food.calories * 2
    );

    if (food.meal_type.includes('protein')) {
      foodCalories = Math.max(foodCalories, targetCalories * 0.3);
    }

    const portionedFood = calculatePortionSize(food, foodCalories, {
      protein: macroTargets.protein * (foodCalories / targetCalories),
      carbs: macroTargets.carbs * (foodCalories / targetCalories),
      fats: macroTargets.fats * (foodCalories / targetCalories),
      fiber: macroTargets.fiber * (foodCalories / targetCalories)
    });

    if (portionedFood.calculatedNutrients.calories > 0) {
      mealFoods.push(portionedFood);
      remainingCalories -= portionedFood.calculatedNutrients.calories;
    }
  }

  return mealFoods;
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
    const breakfastFoods = availableFoods.filter(f => f.meal_type?.includes('breakfast'));
    const snackFoods = availableFoods.filter(f => f.meal_type?.includes('snack'));
    const lunchDinnerFoods = availableFoods.filter(f => 
      f.meal_type?.includes('lunch') || f.meal_type?.includes('dinner')
    );

    weeklyPlan[day] = {
      breakfast: optimizeMealCombinations(
        breakfastFoods,
        dailyCalories * 0.25,
        {
          protein: Math.round(macroTargets.protein * 0.25),
          carbs: Math.round(macroTargets.carbs * 0.25),
          fats: Math.round(macroTargets.fats * 0.25),
          fiber: Math.round(macroTargets.fiber * 0.25)
        },
        goal,
        userPreferences
      ),
      morningSnack: optimizeMealCombinations(
        snackFoods,
        dailyCalories * 0.15,
        {
          protein: Math.round(macroTargets.protein * 0.15),
          carbs: Math.round(macroTargets.carbs * 0.15),
          fats: Math.round(macroTargets.fats * 0.15),
          fiber: Math.round(macroTargets.fiber * 0.15)
        },
        goal,
        userPreferences
      ),
      lunch: optimizeMealCombinations(
        lunchDinnerFoods,
        dailyCalories * 0.30,
        {
          protein: Math.round(macroTargets.protein * 0.30),
          carbs: Math.round(macroTargets.carbs * 0.30),
          fats: Math.round(macroTargets.fats * 0.30),
          fiber: Math.round(macroTargets.fiber * 0.30)
        },
        goal,
        userPreferences
      ),
      afternoonSnack: optimizeMealCombinations(
        snackFoods,
        dailyCalories * 0.10,
        {
          protein: Math.round(macroTargets.protein * 0.10),
          carbs: Math.round(macroTargets.carbs * 0.10),
          fats: Math.round(macroTargets.fats * 0.10),
          fiber: Math.round(macroTargets.fiber * 0.10)
        },
        goal,
        userPreferences
      ),
      dinner: optimizeMealCombinations(
        lunchDinnerFoods,
        dailyCalories * 0.20,
        {
          protein: Math.round(macroTargets.protein * 0.20),
          carbs: Math.round(macroTargets.carbs * 0.20),
          fats: Math.round(macroTargets.fats * 0.20),
          fiber: Math.round(macroTargets.fiber * 0.20)
        },
        goal,
        userPreferences
      )
    };
  }

  return weeklyPlan;
}
