
import { Food } from "./types.ts";

// Calculate appropriate portion size based on target calories
export function calculatePortionSize(food: Food, targetCalories: number): number {
  // Default portion if food has no calories
  if (!food.calories || food.calories === 0) {
    return food.portion || 100;
  }
  
  // Calculate what portion would provide the target calories
  const caloriesPerGram = food.calories / 100; // Assuming food.calories is per 100g
  let calculatedPortion = targetCalories / caloriesPerGram;
  
  // Apply reasonable limits to portion sizes
  // These limits could be food-type specific in a more advanced system
  const minPortion = 20;  // Minimum 20g for any food
  const maxPortion = 500; // Maximum 500g for any food
  
  // For specific food groups, modify portion size
  if (food.food_group_id) {
    switch (food.food_group_id) {
      case 1: // Breakfast foods (cereals, etc.)
        calculatedPortion = Math.min(calculatedPortion, 250);
        break;
      case 2: // Protein sources
        calculatedPortion = Math.min(calculatedPortion, 200);
        break;
      case 3: // Snacks
        calculatedPortion = Math.min(calculatedPortion, 150);
        break;
      case 4: // Vegetables
        calculatedPortion = Math.min(calculatedPortion, 300);
        break;
      default:
        // Use default limits
        break;
    }
  }
  
  // If we have Nutritionix data with serving info, use that to guide portion
  if (food.nutritionix_data && food.nutritionix_data.serving_weight_grams) {
    const servingWeight = food.nutritionix_data.serving_weight_grams;
    
    // Try to make portion a multiple of the standard serving size
    const servings = Math.round(calculatedPortion / servingWeight);
    calculatedPortion = servings * servingWeight;
    
    // Still apply min/max limits
    calculatedPortion = Math.max(servingWeight, calculatedPortion);
    calculatedPortion = Math.min(servingWeight * 5, calculatedPortion);
  }
  
  // Apply global min/max constraints
  calculatedPortion = Math.max(minPortion, calculatedPortion);
  calculatedPortion = Math.min(maxPortion, calculatedPortion);
  
  // Round to nearest 5g for clean values
  return Math.round(calculatedPortion / 5) * 5;
}
