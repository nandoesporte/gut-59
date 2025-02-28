
import type { Food, MacroTargets, MealPlan, MealAnalysis } from './types';
import { calculateNutritionalScore } from './nutritional-scorer';
import { calculatePortionSize } from './portion-calculator.ts';

export function analyzeMealPlan(plan: MealPlan, targetCalories: number, macroTargets: MacroTargets): MealAnalysis {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalFiber = 0;
  let mealCount = 0;

  // Analyze each day
  for (const day of Object.values(plan.weeklyPlan)) {
    if (day.meals) {
      // Analyze each meal in the day
      for (const meal of Object.values(day.meals)) {
        if (meal) {
          totalCalories += meal.calories || 0;
          totalProtein += meal.macros?.protein || 0;
          totalCarbs += meal.macros?.carbs || 0;
          totalFats += meal.macros?.fats || 0;
          totalFiber += meal.macros?.fiber || 0;
          mealCount++;
        }
      }
    }
  }

  // Calculate averages
  const avgCalories = mealCount > 0 ? totalCalories / mealCount : 0;
  const avgProtein = mealCount > 0 ? totalProtein / mealCount : 0;
  const avgCarbs = mealCount > 0 ? totalCarbs / mealCount : 0;
  const avgFats = mealCount > 0 ? totalFats / mealCount : 0;
  const avgFiber = mealCount > 0 ? totalFiber / mealCount : 0;

  // Calculate score
  const score = calculateNutritionalScore({
    calories: avgCalories,
    protein: avgProtein,
    carbs: avgCarbs,
    fats: avgFats,
    fiber: avgFiber
  }, targetCalories, macroTargets);

  return {
    averages: {
      calories: avgCalories,
      protein: avgProtein,
      carbs: avgCarbs,
      fats: avgFats,
      fiber: avgFiber
    },
    totals: {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
      fiber: totalFiber
    },
    mealCount,
    score
  };
}

export function optimizeMealPortions(foods: Food[], targetCalories: number, macroTargets: MacroTargets) {
  return foods.map(food => calculatePortionSize(food, targetCalories / foods.length, macroTargets));
}
