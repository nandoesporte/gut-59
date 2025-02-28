
import { Meal, Food, FoodWithPortion, MacroTargets } from './types';
import { calculatePortionSize } from './portion-calculator.ts';

export function optimizeMeal(
  foods: Food[],
  targetCalories: number,
  macroTargets: MacroTargets
): Meal {
  const selectedFoods: FoodWithPortion[] = [];
  let currentCalories = 0;
  let currentProtein = 0;
  let currentCarbs = 0;
  let currentFats = 0;
  let currentFiber = 0;

  // Simple algorithm to select foods that fit the calorie target
  // We'll improve this with more sophisticated algorithms in future versions
  for (const food of foods) {
    if (currentCalories >= targetCalories * 0.85) break;
    
    // Determine what percentage of the target calories we want to allocate to this food
    // This is a simple approach but can be refined based on nutritional goals
    const targetFoodCalories = Math.min(
      targetCalories * 0.25, // No single food should be more than 25% of the meal
      targetCalories - currentCalories
    );
    
    // Calculate appropriate portion based on target calories and macros
    const foodWithPortion = calculatePortionSize(food, targetFoodCalories, macroTargets);
    
    // Add to our meal
    selectedFoods.push(foodWithPortion);
    
    // Update running totals
    currentCalories += foodWithPortion.calculatedNutrients.calories;
    currentProtein += foodWithPortion.calculatedNutrients.protein;
    currentCarbs += foodWithPortion.calculatedNutrients.carbs;
    currentFats += foodWithPortion.calculatedNutrients.fats;
    currentFiber += foodWithPortion.calculatedNutrients.fiber;
  }

  return {
    foods: selectedFoods,
    totalNutrients: {
      calories: Math.round(currentCalories),
      protein: Math.round(currentProtein),
      carbs: Math.round(currentCarbs),
      fats: Math.round(currentFats),
      fiber: Math.round(currentFiber)
    }
  };
}
