
import type { Food, MacroTargets, FoodWithPortion } from './types.ts';
import { calculatePortionSize } from './portion-calculator.ts';
import { calculateNutritionalScore } from './nutritional-scorer.ts';

function categorizeFoods(foods: Food[]): {
  carbs: Food[];
  proteins: Food[];
  fats: Food[];
  vegetables: Food[];
  fruits: Food[];
} {
  return foods.reduce((acc, food) => {
    if (!food.nutritional_category) {
      // Categorize based on macronutrient ratios if categories not explicitly set
      const totalMacros = food.protein + food.carbs + food.fats;
      const proteinRatio = food.protein / totalMacros;
      const carbsRatio = food.carbs / totalMacros;
      const fatsRatio = food.fats / totalMacros;

      if (proteinRatio > 0.3) acc.proteins.push(food);
      else if (carbsRatio > 0.5) acc.carbs.push(food);
      else if (fatsRatio > 0.3) acc.fats.push(food);
      
      if (food.meal_type?.includes('vegetable')) acc.vegetables.push(food);
      if (food.meal_type?.includes('fruit')) acc.fruits.push(food);
    } else {
      food.nutritional_category.forEach(category => {
        switch (category) {
          case 'carb':
            acc.carbs.push(food);
            break;
          case 'protein':
            acc.proteins.push(food);
            break;
          case 'fat':
            acc.fats.push(food);
            break;
          case 'vegetable':
            acc.vegetables.push(food);
            break;
          case 'fruit':
            acc.fruits.push(food);
            break;
        }
      });
    }
    return acc;
  }, {
    carbs: [] as Food[],
    proteins: [] as Food[],
    fats: [] as Food[],
    vegetables: [] as Food[],
    fruits: [] as Food[]
  });
}

export function optimizeMealCombinations(
  foods: Food[],
  targetCalories: number,
  macroTargets: MacroTargets,
  goal: string,
  userPreferences: {
    likedFoods?: string[];
    dislikedFoods?: string[];
  },
  mealType: 'breakfast' | 'snack' | 'main'
): FoodWithPortion[] {
  const categorizedFoods = categorizeFoods(foods);
  const mealFoods: FoodWithPortion[] = [];
  const caloriesPerCategory = {
    carbs: targetCalories * 0.45,
    proteins: targetCalories * 0.30,
    fats: targetCalories * 0.25
  };

  // Define minimum requirements based on meal type
  const requirements = {
    breakfast: {
      carbs: 1,
      proteins: 1,
      fats: 1,
      fruits: 1
    },
    snack: {
      proteins: 1,
      carbs: 1
    },
    main: {
      carbs: 1,
      proteins: 1,
      vegetables: 2,
      fats: 1
    }
  };

  const currentMealReqs = requirements[mealType];

  // Helper function to add a food item from a category
  const addFoodFromCategory = (
    category: Food[],
    targetCals: number,
    macroTargets: MacroTargets
  ): boolean => {
    if (category.length === 0) return false;

    const scoredFoods = category
      .map(food => ({
        ...food,
        score: calculateNutritionalScore(food, goal, userPreferences)
      }))
      .sort((a, b) => b.score - a.score);

    const selectedFood = scoredFoods[0];
    if (!selectedFood) return false;

    const portionedFood = calculatePortionSize(selectedFood, targetCals, macroTargets);
    if (portionedFood.calculatedNutrients.calories > 0) {
      mealFoods.push(portionedFood);
      return true;
    }
    return false;
  };

  // Add required foods for each category based on meal type
  if (mealType === 'breakfast') {
    addFoodFromCategory(categorizedFoods.carbs, caloriesPerCategory.carbs * 0.5, macroTargets);
    addFoodFromCategory(categorizedFoods.proteins, caloriesPerCategory.proteins * 0.5, macroTargets);
    addFoodFromCategory(categorizedFoods.fats, caloriesPerCategory.fats * 0.5, macroTargets);
    addFoodFromCategory(categorizedFoods.fruits, targetCalories * 0.1, macroTargets);
  } else if (mealType === 'snack') {
    addFoodFromCategory(categorizedFoods.proteins, caloriesPerCategory.proteins * 0.5, macroTargets);
    addFoodFromCategory(categorizedFoods.carbs, caloriesPerCategory.carbs * 0.5, macroTargets);
  } else if (mealType === 'main') {
    addFoodFromCategory(categorizedFoods.carbs, caloriesPerCategory.carbs * 0.4, macroTargets);
    addFoodFromCategory(categorizedFoods.proteins, caloriesPerCategory.proteins * 0.4, macroTargets);
    addFoodFromCategory(categorizedFoods.vegetables, targetCalories * 0.1, macroTargets);
    addFoodFromCategory(categorizedFoods.vegetables, targetCalories * 0.1, macroTargets);
    addFoodFromCategory(categorizedFoods.fats, caloriesPerCategory.fats * 0.4, macroTargets);
  }

  return mealFoods;
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
        userPreferences,
        'breakfast'
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
        userPreferences,
        'snack'
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
        userPreferences,
        'main'
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
        userPreferences,
        'snack'
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
        userPreferences,
        'main'
      )
    };
  }

  return weeklyPlan;
}
