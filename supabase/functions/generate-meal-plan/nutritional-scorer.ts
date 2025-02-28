
import { FoodWithPortion } from "./types.ts";

// Calculate a nutritional score for a set of foods
export function calculateNutritionalScore(foods: FoodWithPortion[]): number {
  if (!foods || foods.length === 0) return 0;
  
  // This is a simplified nutritional scoring system
  // In a real system, you'd use a more comprehensive approach
  
  // 1. Macronutrient balance (40%)
  const macroBalance = calculateMacroBalance(foods);
  
  // 2. Micronutrient coverage (not implemented in this simple version)
  // Would require detailed micronutrient data for each food
  const micronutrientScore = 70; // Placeholder score
  
  // 3. Food variety (30%)
  const varietyScore = calculateVarietyScore(foods);
  
  // 4. Fiber content (30%)
  const fiberScore = calculateFiberScore(foods);
  
  // Calculate the final weighted score
  const finalScore = (
    macroBalance * 0.4 + 
    micronutrientScore * 0.3 + 
    varietyScore * 0.15 +
    fiberScore * 0.15
  );
  
  return Math.min(100, Math.max(0, finalScore));
}

// Calculate macronutrient balance
function calculateMacroBalance(foods: FoodWithPortion[]): number {
  // Calculate total calories
  const totalCalories = foods.reduce((sum, food) => 
    sum + food.calculatedNutrients.calories, 0);
  
  if (totalCalories === 0) return 0;
  
  // Calculate macro percentages
  const totalProtein = foods.reduce((sum, food) => 
    sum + food.calculatedNutrients.protein, 0);
  const totalCarbs = foods.reduce((sum, food) => 
    sum + food.calculatedNutrients.carbs, 0);
  const totalFats = foods.reduce((sum, food) => 
    sum + food.calculatedNutrients.fats, 0);
  
  const proteinCalories = totalProtein * 4;
  const carbsCalories = totalCarbs * 4;
  const fatsCalories = totalFats * 9;
  
  const proteinPct = (proteinCalories / totalCalories) * 100;
  const carbsPct = (carbsCalories / totalCalories) * 100;
  const fatsPct = (fatsCalories / totalCalories) * 100;
  
  // Ideal macro ranges (these could be adjusted based on goals)
  const idealProteinPct = { min: 20, max: 35 };
  const idealCarbsPct = { min: 45, max: 65 };
  const idealFatsPct = { min: 20, max: 35 };
  
  // Score based on how close macros are to ideal ranges
  const proteinScore = proteinPct >= idealProteinPct.min && proteinPct <= idealProteinPct.max ? 
    100 : (100 - Math.min(Math.abs(proteinPct - idealProteinPct.min), Math.abs(proteinPct - idealProteinPct.max)));
  
  const carbsScore = carbsPct >= idealCarbsPct.min && carbsPct <= idealCarbsPct.max ? 
    100 : (100 - Math.min(Math.abs(carbsPct - idealCarbsPct.min), Math.abs(carbsPct - idealCarbsPct.max)));
  
  const fatsScore = fatsPct >= idealFatsPct.min && fatsPct <= idealFatsPct.max ? 
    100 : (100 - Math.min(Math.abs(fatsPct - idealFatsPct.min), Math.abs(fatsPct - idealFatsPct.max)));
  
  // Average the three scores
  return (proteinScore + carbsScore + fatsScore) / 3;
}

// Calculate a score for food variety
function calculateVarietyScore(foods: FoodWithPortion[]): number {
  if (foods.length === 0) return 0;
  
  // Simple measure: count unique food groups
  const uniqueFoodGroups = new Set<number>();
  foods.forEach(food => {
    if (food.food_group_id) {
      uniqueFoodGroups.add(food.food_group_id);
    }
  });
  
  // More unique food groups = better variety
  const maxGroups = 5; // Assuming 5 possible food groups
  const varietyScore = (uniqueFoodGroups.size / maxGroups) * 100;
  
  return Math.min(100, varietyScore);
}

// Calculate a score for fiber content
function calculateFiberScore(foods: FoodWithPortion[]): number {
  const totalCalories = foods.reduce((sum, food) => 
    sum + food.calculatedNutrients.calories, 0);
  
  if (totalCalories === 0) return 0;
  
  const totalFiber = foods.reduce((sum, food) => 
    sum + food.calculatedNutrients.fiber, 0);
  
  // Calculate fiber density (g per 1000 calories)
  const fiberDensity = (totalFiber / totalCalories) * 1000;
  
  // Score based on fiber density
  // Target: ~14g per 1000 calories is ideal
  if (fiberDensity >= 14) {
    return 100;
  } else {
    return (fiberDensity / 14) * 100;
  }
}
