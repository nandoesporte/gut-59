
import { MacroTargets, Food, FoodWithPortion, MealPlanResult } from "./types.ts";

export function analyzeMealDistribution(
  dailyMealPlan: MealPlanResult,
  macroTargets: MacroTargets
): { score: number; feedback: string[] } {
  try {
    const { totalCalories, macroDistribution } = dailyMealPlan.nutritionalAnalysis;

    // Initialize scoring
    let score = 0;
    const feedback: string[] = [];

    // Analyze protein distribution
    const proteinPercentage = (macroDistribution.protein * 4 / totalCalories) * 100;
    if (proteinPercentage >= 25 && proteinPercentage <= 35) {
      score += 30;
      feedback.push("Boa distribuição de proteínas nas refeições");
    } else if (proteinPercentage >= 20 && proteinPercentage <= 40) {
      score += 20;
      feedback.push("Distribuição de proteínas satisfatória");
    } else {
      score += 10;
      feedback.push("Distribuição de proteínas pode ser melhorada");
    }

    // Analyze carb distribution
    const carbPercentage = (macroDistribution.carbs * 4 / totalCalories) * 100;
    if (carbPercentage >= 40 && carbPercentage <= 55) {
      score += 30;
      feedback.push("Boa distribuição de carboidratos nas refeições");
    } else if (carbPercentage >= 35 && carbPercentage <= 60) {
      score += 20;
      feedback.push("Distribuição de carboidratos satisfatória");
    } else {
      score += 10;
      feedback.push("Distribuição de carboidratos pode ser melhorada");
    }

    // Analyze fat distribution
    const fatPercentage = (macroDistribution.fats * 9 / totalCalories) * 100;
    if (fatPercentage >= 20 && fatPercentage <= 35) {
      score += 30;
      feedback.push("Boa distribuição de gorduras nas refeições");
    } else if (fatPercentage >= 15 && fatPercentage <= 40) {
      score += 20;
      feedback.push("Distribuição de gorduras satisfatória");
    } else {
      score += 10;
      feedback.push("Distribuição de gorduras pode ser melhorada");
    }

    // Analyze fiber
    if (macroDistribution.fiber >= 25) {
      score += 10;
      feedback.push("Excelente quantidade de fibra no plano");
    } else if (macroDistribution.fiber >= 20) {
      score += 5;
      feedback.push("Boa quantidade de fibra no plano");
    } else {
      feedback.push("Aumente o consumo de alimentos ricos em fibras");
    }

    return { score, feedback };
  } catch (error) {
    console.error("Error during meal distribution analysis:", error);
    return { score: 50, feedback: ["Não foi possível analisar completamente a distribuição nutricional"] };
  }
}

export function analyzeNutrientBalance(
  mealPlan: MealPlanResult,
  dailyCalorieTarget: number
): { score: number; feedback: string[] } {
  const feedback: string[] = [];
  let score = 0;
  
  const { totalCalories } = mealPlan.nutritionalAnalysis;
  
  // Check if total calories are within 10% of target
  const calorieDeviation = Math.abs(totalCalories - dailyCalorieTarget) / dailyCalorieTarget;
  
  if (calorieDeviation <= 0.05) {
    score += 30;
    feedback.push("Excelente equilíbrio calórico, muito próximo do ideal");
  } else if (calorieDeviation <= 0.1) {
    score += 20;
    feedback.push("Bom equilíbrio calórico, próximo do ideal");
  } else if (calorieDeviation <= 0.15) {
    score += 10;
    feedback.push("Equilíbrio calórico razoável, mas poderia ser melhor ajustado");
  } else {
    feedback.push("O plano se desvia significativamente do alvo calórico diário");
  }
  
  // Check meal distribution
  const breakfastCals = calculateMealCalories(mealPlan.breakfast);
  const morningSnackCals = calculateMealCalories(mealPlan.morning_snack);
  const lunchCals = calculateMealCalories(mealPlan.lunch);
  const afternoonSnackCals = calculateMealCalories(mealPlan.afternoon_snack);
  const dinnerCals = calculateMealCalories(mealPlan.dinner);
  
  const idealBreakfastPct = 0.25;
  const idealLunchPct = 0.35;
  const idealDinnerPct = 0.25;
  const idealSnackPct = 0.075; // For each snack
  
  const actualBreakfastPct = breakfastCals / totalCalories;
  const actualLunchPct = lunchCals / totalCalories;
  const actualDinnerPct = dinnerCals / totalCalories;
  const actualMorningSnackPct = morningSnackCals / totalCalories;
  const actualAfternoonSnackPct = afternoonSnackCals / totalCalories;
  
  if (Math.abs(actualBreakfastPct - idealBreakfastPct) <= 0.05 &&
      Math.abs(actualLunchPct - idealLunchPct) <= 0.05 &&
      Math.abs(actualDinnerPct - idealDinnerPct) <= 0.05) {
    score += 30;
    feedback.push("Excelente distribuição calórica entre as refeições principais");
  } else if (Math.abs(actualBreakfastPct - idealBreakfastPct) <= 0.1 &&
             Math.abs(actualLunchPct - idealLunchPct) <= 0.1 &&
             Math.abs(actualDinnerPct - idealDinnerPct) <= 0.1) {
    score += 20;
    feedback.push("Boa distribuição calórica entre as refeições principais");
  } else {
    score += 10;
    feedback.push("A distribuição calórica entre as refeições pode ser melhorada");
  }
  
  // Check for extremes
  const maxMealPct = Math.max(actualBreakfastPct, actualLunchPct, actualDinnerPct);
  const minMealPct = Math.min(actualBreakfastPct, actualLunchPct, actualDinnerPct);
  
  if (maxMealPct > 0.5) {
    feedback.push("Uma refeição contém mais de 50% das calorias diárias, o que não é ideal");
    score -= 10;
  }
  
  if (minMealPct < 0.15) {
    feedback.push("Uma refeição principal é muito pequena, o que pode causar fome e lanches não planejados");
    score -= 10;
  }
  
  // Check snacks
  if (Math.abs(actualMorningSnackPct - idealSnackPct) <= 0.03 &&
      Math.abs(actualAfternoonSnackPct - idealSnackPct) <= 0.03) {
    score += 20;
    feedback.push("Lanches bem equilibrados em relação ao total calórico");
  } else if (Math.abs(actualMorningSnackPct - idealSnackPct) <= 0.05 &&
             Math.abs(actualAfternoonSnackPct - idealSnackPct) <= 0.05) {
    score += 10;
    feedback.push("Lanches razoavelmente equilibrados");
  }
  
  // Cap the score at 100
  score = Math.min(score, 100);
  
  return { score, feedback };
}

function calculateMealCalories(foods: FoodWithPortion[]): number {
  return foods.reduce((sum, food) => sum + food.calculatedNutrients.calories, 0);
}
