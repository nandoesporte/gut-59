
import type { Food, MacroTargets, FoodWithPortion } from './types.ts';
import { calculatePortion, validateNutrition } from './calculators.ts';

export function analyzeWorkoutCompatibility(
  foods: Food[],
  trainingTime: string | null,
  isPreWorkout: boolean
): Food[] {
  if (!trainingTime) return foods;

  return foods.filter(food => {
    if (isPreWorkout) {
      return food.pre_workout_compatible && 
             (food.preparation_time_minutes <= 30) && 
             (food.glycemic_index ? food.glycemic_index > 55 : true);
    } else {
      return food.post_workout_compatible;
    }
  });
}

export function calculateNutritionalScore(
  food: Food,
  goal: string,
  userPreferences: {
    likedFoods?: string[];
    dislikedFoods?: string[];
  }
): number {
  let score = 0;
  
  // Pontuação base por macronutrientes
  if (food.protein) score += (goal === 'gain' ? 3 : 2);
  if (food.fiber) score += 1;
  if (food.vitamins) score += Object.keys(food.vitamins).length * 0.5;
  if (food.minerals) score += Object.keys(food.minerals).length * 0.5;
  
  // Pontuação específica por objetivo
  switch (goal) {
    case 'lose':
      if (food.fiber > 3) score += 2;
      if (food.glycemic_index && food.glycemic_index < 55) score += 2;
      if (food.protein / food.calories > 0.1) score += 2; // Densidade proteica
      break;
    case 'gain':
      if (food.calories > 200) score += 1;
      if (food.protein > 20) score += 2;
      if (food.carbs / food.calories > 0.5) score += 1;
      break;
    default:
      if (food.fiber > 2) score += 1;
      if (food.protein / food.calories > 0.15) score += 1;
      score += 1;
  }

  // Ajuste baseado em preferências do usuário
  if (userPreferences.likedFoods?.includes(food.id)) {
    score += 2;
  }
  if (userPreferences.dislikedFoods?.includes(food.id)) {
    score -= 3;
  }

  return score;
}

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
  const combinations: FoodWithPortion[][] = [];
  const maxFoods = 4;
  const maxAttempts = 10;
  let attempts = 0;

  while (attempts < maxAttempts && combinations.length < 3) {
    const scoredFoods = foods
      .map(food => ({
        ...food,
        nutritionalScore: calculateNutritionalScore(food, goal, userPreferences)
      }))
      .sort((a, b) => b.nutritionalScore - a.nutritionalScore);

    const selectedFoods: FoodWithPortion[] = [];
    let remainingCalories = targetCalories;
    let remainingTargets = { ...macroTargets };

    for (let i = 0; i < Math.min(maxFoods, scoredFoods.length) && remainingCalories > 0; i++) {
      const food = scoredFoods[i];
      const portionedFood = calculatePortion(food, remainingCalories, remainingTargets);
      
      if (portionedFood.calculatedNutrients.calories > 0) {
        selectedFoods.push(portionedFood);
        remainingCalories -= portionedFood.calculatedNutrients.calories;
        remainingTargets = {
          protein: remainingTargets.protein - portionedFood.calculatedNutrients.protein,
          carbs: remainingTargets.carbs - portionedFood.calculatedNutrients.carbs,
          fats: remainingTargets.fats - portionedFood.calculatedNutrients.fats,
          fiber: remainingTargets.fiber - portionedFood.calculatedNutrients.fiber
        };
      }
    }

    if (validateNutrition(selectedFoods, macroTargets)) {
      combinations.push(selectedFoods);
    }

    attempts++;
  }

  return combinations[0] || [];
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
