import type { Food, MacroTargets, FoodWithPortion } from './types.ts';

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

function calculatePortionSize(
  food: Food,
  targetCalories: number,
  macroTargets: MacroTargets
): FoodWithPortion {
  // Calcula a porção ideal baseada nas calorias alvo
  const caloriesPerGram = food.calories / food.serving_size;
  let targetPortion = Math.round((targetCalories / caloriesPerGram) * 100) / 100;

  // Ajusta a porção para uma medida mais amigável
  let portionUnit = food.serving_unit;
  let friendlyPortion = targetPortion;

  // Converte para medidas caseiras quando possível
  if (food.serving_unit === 'g' || food.serving_unit === 'ml') {
    if (food.name.includes('pão')) {
      portionUnit = 'fatia';
      friendlyPortion = Math.round(targetPortion / 30);
    } else if (food.name.includes('arroz') || food.name.includes('quinoa')) {
      portionUnit = 'xícara';
      friendlyPortion = Math.round((targetPortion / 100) * 10) / 10;
    } else if (food.name.includes('azeite') || food.name.includes('manteiga')) {
      portionUnit = 'colher de sopa';
      friendlyPortion = Math.round((targetPortion / 15) * 10) / 10;
    } else if (food.name.includes('granola')) {
      portionUnit = 'colher de sopa';
      friendlyPortion = Math.round(targetPortion / 15);
    }
  }

  const calculatedCalories = Math.round((food.calories / food.serving_size) * targetPortion);
  const calculatedProtein = Math.round((food.protein / food.serving_size) * targetPortion * 10) / 10;
  const calculatedCarbs = Math.round((food.carbs / food.serving_size) * targetPortion * 10) / 10;
  const calculatedFats = Math.round((food.fats / food.serving_size) * targetPortion * 10) / 10;
  const calculatedFiber = Math.round((food.fiber / food.serving_size) * targetPortion * 10) / 10;

  return {
    ...food,
    portion: friendlyPortion,
    portionUnit,
    calculatedNutrients: {
      calories: calculatedCalories,
      protein: calculatedProtein,
      carbs: calculatedCarbs,
      fats: calculatedFats,
      fiber: calculatedFiber
    }
  };
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
  const mealFoods: FoodWithPortion[] = [];
  let remainingCalories = targetCalories;
  const minCaloriesPerFood = 30; // Mínimo de calorias por alimento para evitar porções muito pequenas

  // Ordena os alimentos por score nutricional
  const scoredFoods = foods
    .map(food => ({
      ...food,
      score: calculateNutritionalScore(food, goal, userPreferences)
    }))
    .sort((a, b) => b.score - a.score);

  // Distribui as calorias entre os alimentos
  for (const food of scoredFoods) {
    if (remainingCalories < minCaloriesPerFood || mealFoods.length >= 5) break;

    // Calcula quantas calorias alocar para este alimento
    let foodCalories = Math.min(
      remainingCalories,
      food.calories * 2 // Limita a porção a 2x o tamanho padrão
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

function calculateNutritionalScore(
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
      if (food.protein / food.calories > 0.1) score += 2;
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
