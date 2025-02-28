
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Food, FoodWithPortion, MealPlanResult } from "./types.ts";
import { calculateNutritionalScore } from "./nutritional-scorer.ts";
import { calculatePortionSize } from "./portion-calculator.ts";

export interface MealAnalysis {
  totalCalories: number;
  macroDistribution: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  nutritionalScore: number;
  balanceScore: number;
  varietyScore: number;
}

// Analyze a meal for its nutritional content
export function analyzeMeal(foods: FoodWithPortion[]): MealAnalysis {
  if (!foods || foods.length === 0) {
    return {
      totalCalories: 0,
      macroDistribution: { protein: 0, carbs: 0, fats: 0, fiber: 0 },
      nutritionalScore: 0,
      balanceScore: 0,
      varietyScore: 0
    };
  }

  // Calculate total calories and macros
  const totalCalories = foods.reduce((sum, food) => sum + food.calculatedNutrients.calories, 0);
  const totalProtein = foods.reduce((sum, food) => sum + food.calculatedNutrients.protein, 0);
  const totalCarbs = foods.reduce((sum, food) => sum + food.calculatedNutrients.carbs, 0);
  const totalFats = foods.reduce((sum, food) => sum + food.calculatedNutrients.fats, 0);
  const totalFiber = foods.reduce((sum, food) => sum + food.calculatedNutrients.fiber, 0);

  // Calculate macro percentages
  const proteinCalories = totalProtein * 4;
  const carbsCalories = totalCarbs * 4;
  const fatsCalories = totalFats * 9;

  const proteinPct = totalCalories > 0 ? (proteinCalories / totalCalories) * 100 : 0;
  const carbsPct = totalCalories > 0 ? (carbsCalories / totalCalories) * 100 : 0;
  const fatsPct = totalCalories > 0 ? (fatsCalories / totalCalories) * 100 : 0;

  // Calculate nutritional score
  const nutritionalScore = calculateNutritionalScore(foods);

  // Calculate balance score (how well it adheres to macro guidelines)
  let balanceScore = 0;
  if (totalCalories > 0) {
    // Ideal macro ranges
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

    balanceScore = (proteinScore + carbsScore + fatsScore) / 3;
  }

  // Calculate variety score based on unique food categories
  const uniqueFoodCategories = new Set<string>();
  foods.forEach(food => {
    if (food.nutritional_category && Array.isArray(food.nutritional_category)) {
      food.nutritional_category.forEach(category => uniqueFoodCategories.add(category));
    } else if (food.substitution_group) {
      uniqueFoodCategories.add(food.substitution_group);
    }
  });

  // More unique categories = better variety
  const varietyScore = Math.min(100, uniqueFoodCategories.size * 20);

  return {
    totalCalories,
    macroDistribution: {
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
      fiber: totalFiber
    },
    nutritionalScore,
    balanceScore,
    varietyScore
  };
}

// Analyze an entire meal plan
export function analyzeMealPlan(mealPlan: MealPlanResult): {
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  overallScore: number;
} {
  const allFoods: FoodWithPortion[] = [
    ...mealPlan.breakfast,
    ...mealPlan.morning_snack,
    ...mealPlan.lunch,
    ...mealPlan.afternoon_snack,
    ...mealPlan.dinner
  ];

  const analysis = analyzeMeal(allFoods);
  
  // Overall score is a weighted average of all factors
  const overallScore = (
    analysis.nutritionalScore * 0.4 + 
    analysis.balanceScore * 0.4 + 
    analysis.varietyScore * 0.2
  );

  return {
    dailyTotals: analysis.macroDistribution,
    overallScore
  };
}
