
import { Food, FoodWithPortion, MacroTargets } from "./types.ts";

// Function to calculate appropriate portions based on calorie and macro targets
export function calculatePortions(
  foods: Food[],
  dailyCalories: number,
  macroTargets: MacroTargets
): FoodWithPortion[] {
  console.log("Calculating portions for", foods.length, "foods");
  
  // If no foods are provided, return an empty array
  if (!foods || foods.length === 0) {
    return [];
  }

  // Basic calculation: Distribute calories evenly among foods
  const caloriesPerFood = dailyCalories / foods.length;
  
  return foods.map(food => {
    // Skip foods with zero calories to avoid division by zero
    if (!food.calories || food.calories <= 0) {
      return {
        ...food,
        portion: 100, // Default portion
        portionUnit: "g",
        calculatedNutrients: {
          calories: food.calories || 0,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fats: food.fats || 0,
          fiber: food.fiber || 0
        }
      };
    }
    
    // Calculate portion size to achieve target calories for this food
    const portionMultiplier = caloriesPerFood / food.calories;
    const portion = Math.round(100 * portionMultiplier); // Base portion is 100g
    
    // Calculate actual nutrients based on the new portion
    const calculatedNutrients = {
      calories: Math.round(food.calories * portionMultiplier),
      protein: Math.round((food.protein || 0) * portionMultiplier),
      carbs: Math.round((food.carbs || 0) * portionMultiplier),
      fats: Math.round((food.fats || 0) * portionMultiplier),
      fiber: Math.round((food.fiber || 0) * portionMultiplier)
    };
    
    return {
      ...food,
      portion,
      portionUnit: "g",
      calculatedNutrients
    };
  });
}

// Function to optimize portion sizes to meet macro targets
export function optimizePortions(
  foods: FoodWithPortion[],
  macroTargets: MacroTargets
): FoodWithPortion[] {
  // Simple implementation for now
  // In a real implementation, this could use more sophisticated algorithms
  return foods;
}
