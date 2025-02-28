
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Food, FoodWithPortion, MacroTargets } from "./types.ts";
import { calculatePortionSize } from "./portion-calculator.ts";
import { analyzeMeal } from "./meal-analyzer.ts";

// Find optimal combinations of foods for a meal
export function optimizeMeal(
  availableFoods: Food[],
  targetCalories: number,
  macroTargets: MacroTargets,
  mealType: string,
  options: {
    allergens?: string[],
    restrictions?: string[],
    preferredFoods?: string[],
    mealTypeFoods?: Food[]
  } = {}
): FoodWithPortion[] {
  if (!availableFoods || availableFoods.length === 0) {
    console.log("No foods available for optimization");
    return [];
  }

  // Filter out foods that match allergens or restrictions
  let filteredFoods = [...availableFoods];
  
  if (options.allergens && options.allergens.length > 0) {
    filteredFoods = filteredFoods.filter(food => {
      // Simple string matching for allergens in food name
      return !options.allergens?.some(allergen => 
        food.name.toLowerCase().includes(allergen.toLowerCase())
      );
    });
  }
  
  if (options.restrictions && options.restrictions.length > 0) {
    filteredFoods = filteredFoods.filter(food => {
      // Simple string matching for restrictions in food name
      return !options.restrictions?.some(restriction => 
        food.name.toLowerCase().includes(restriction.toLowerCase())
      );
    });
  }

  // Prioritize foods appropriate for this meal type if available
  let mealTypeFoods = options.mealTypeFoods || [];
  if (mealTypeFoods.length === 0 && mealType) {
    // Map meal types to likely food groups if specific meal type foods weren't provided
    if (mealType === 'breakfast') {
      mealTypeFoods = filteredFoods.filter(f => f.food_group_id === 1);
    } else if (mealType === 'lunch' || mealType === 'dinner') {
      mealTypeFoods = filteredFoods.filter(f => f.food_group_id === 2 || f.food_group_id === 4);
    } else if (mealType.includes('snack')) {
      mealTypeFoods = filteredFoods.filter(f => f.food_group_id === 3);
    }
  }

  // Prioritize preferred foods if specified
  let prioritizedFoods = [...filteredFoods];
  if (options.preferredFoods && options.preferredFoods.length > 0) {
    // Sort to put preferred foods first
    prioritizedFoods.sort((a, b) => {
      const aPreferred = options.preferredFoods?.includes(a.id) || false;
      const bPreferred = options.preferredFoods?.includes(b.id) || false;
      return aPreferred === bPreferred ? 0 : aPreferred ? -1 : 1;
    });
  }

  // Create a balanced meal
  // This is a simplified algorithm - in a real system, you'd use more advanced optimization
  const result: FoodWithPortion[] = [];
  let currentCalories = 0;
  let currentProtein = 0;
  let currentCarbs = 0;
  let currentFats = 0;
  
  // First try to add meal-appropriate foods
  if (mealTypeFoods.length > 0) {
    // Shuffle to get variety
    mealTypeFoods = shuffle(mealTypeFoods);
    
    // Take 2-3 foods from the meal type appropriate list
    const foodCount = Math.min(Math.floor(Math.random() * 2) + 2, mealTypeFoods.length);
    for (let i = 0; i < foodCount; i++) {
      if (currentCalories >= targetCalories * 0.8) break;
      
      const food = mealTypeFoods[i];
      const portion = calculatePortionSize(food, targetCalories / foodCount);
      
      result.push({
        ...food,
        portion,
        portionUnit: food.portionUnit || 'g',
        calculatedNutrients: {
          calories: Math.round((food.calories / 100) * portion),
          protein: Math.round((food.protein / 100) * portion),
          carbs: Math.round((food.carbs / 100) * portion),
          fats: Math.round((food.fats / 100) * portion),
          fiber: Math.round(((food.fiber || 0) / 100) * portion)
        }
      });
      
      currentCalories += (food.calories / 100) * portion;
      currentProtein += (food.protein / 100) * portion;
      currentCarbs += (food.carbs / 100) * portion;
      currentFats += (food.fats / 100) * portion;
    }
  }
  
  // If we still need more calories, add from the general list
  if (currentCalories < targetCalories * 0.8) {
    // Shuffle for variety
    prioritizedFoods = shuffle(prioritizedFoods);
    
    for (const food of prioritizedFoods) {
      // Skip foods we've already added
      if (result.some(f => f.id === food.id)) continue;
      
      // Stop if we've reached enough calories
      if (currentCalories >= targetCalories * 0.95) break;
      
      // Decide portion based on remaining calories and macro targets
      const remainingCalories = targetCalories - currentCalories;
      const portion = calculatePortionSize(food, remainingCalories * 0.5);
      
      result.push({
        ...food,
        portion,
        portionUnit: food.portionUnit || 'g',
        calculatedNutrients: {
          calories: Math.round((food.calories / 100) * portion),
          protein: Math.round((food.protein / 100) * portion),
          carbs: Math.round((food.carbs / 100) * portion),
          fats: Math.round((food.fats / 100) * portion),
          fiber: Math.round(((food.fiber || 0) / 100) * portion)
        }
      });
      
      currentCalories += (food.calories / 100) * portion;
      currentProtein += (food.protein / 100) * portion;
      currentCarbs += (food.carbs / 100) * portion;
      currentFats += (food.fats / 100) * portion;
      
      // Don't add too many foods
      if (result.length >= 5) break;
    }
  }
  
  // Analyze the meal for optimization feedback
  const analysis = analyzeMeal(result);
  
  return result;
}

// Helper function to shuffle array
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
