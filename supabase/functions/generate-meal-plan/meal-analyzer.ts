import { calculateNutritionalScore } from './nutritional-scorer.ts';
import { calculatePortionSize } from './portion-calculator.ts';
import type { Food, MealPlan, MealType, UserPreferences } from './types';

export function analyzeMealPlan(
  foods: Food[],
  userPreferences: UserPreferences,
  goal: string
): MealPlan {
  // Filter foods based on dietary restrictions and allergies
  const allowedFoods = foods.filter(food => {
    if (userPreferences.allergies && userPreferences.allergies.length > 0) {
      if (food.allergens && food.allergens.some(allergen => userPreferences.allergies?.includes(allergen))) {
        return false; // Food contains allergens the user is allergic to
      }
    }
    if (userPreferences.dietaryRestrictions && userPreferences.dietaryRestrictions.length > 0) {
      if (food.suitable_for && !food.suitable_for.some(restriction => userPreferences.dietaryRestrictions?.includes(restriction))) {
        return false; // Food is not suitable for the user's dietary restrictions
      }
    }
    return true; // Food is allowed
  });

  // Score each food based on nutritional value and user preferences
  const scoredFoods = allowedFoods.map(food => ({
    ...food,
    score: calculateNutritionalScore(food, goal, {
      likedFoods: userPreferences.likedFoods,
      dislikedFoods: userPreferences.dislikedFoods
    })
  }));

  // Sort foods by score
  const sortedFoods = scoredFoods.sort((a, b) => b.score - a.score);

  // Determine portion sizes for each meal
  const breakfastFoods = sortedFoods.filter(food => food.meal_type?.includes('breakfast'));
  const lunchFoods = sortedFoods.filter(food => food.meal_type?.includes('lunch'));
  const dinnerFoods = sortedFoods.filter(food => food.meal_type?.includes('dinner'));
  const snackFoods = sortedFoods.filter(food => food.meal_type?.includes('snack'));

  const breakfast = selectFoodsForMeal(breakfastFoods, 'breakfast');
  const lunch = selectFoodsForMeal(lunchFoods, 'lunch');
  const dinner = selectFoodsForMeal(dinnerFoods, 'dinner');
  const snacks = selectFoodsForMeal(snackFoods, 'snack');

  // Construct the meal plan
  const mealPlan: MealPlan = {
    breakfast,
    lunch,
    dinner,
    snacks,
    totalCalories: breakfast.calories + lunch.calories + dinner.calories + snacks.calories,
    totalProtein: breakfast.protein + lunch.protein + dinner.protein + snacks.protein,
    totalCarbs: breakfast.carbs + lunch.carbs + dinner.carbs + snacks.carbs,
    totalFats: breakfast.fats + lunch.fats + dinner.fats + snacks.fats
  };

  return mealPlan;
}

function selectFoodsForMeal(foods: Food[], mealType: MealType): {
  foods: {
    name: string;
    portion: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
} {
  let selectedFoods = [];
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;

  for (const food of foods) {
    const portion = calculatePortionSize(food); // Assuming this function exists
    selectedFoods.push({
      name: food.name,
      portion: portion,
      unit: food.serving_unit || 'g',
      calories: (food.calories / 100) * portion,
      protein: (food.protein / 100) * portion,
      carbs: (food.carbs / 100) * portion,
      fats: (food.fats / 100) * portion
    });
    calories += (food.calories / 100) * portion;
    protein += (food.protein / 100) * portion;
    carbs += (food.carbs / 100) * portion;
    fats += (food.fats / 100) * portion;
  }

  return {
    foods: selectedFoods,
    calories: calories,
    protein: protein,
    carbs: carbs,
    fats: fats
  };
}
