
import type { Food, MacroTargets, FoodWithPortion } from './types';
import { calculatePortionSize } from './portion-calculator';

const DEFAULT_MEAL_STRUCTURE = {
  breakfast: {
    targetCalories: 300,
    requiredCategories: ['carbs_complex', 'protein', 'healthy_fats', 'fruit'],
    examples: [
      { name: 'pão integral', portion: '1 fatia', category: 'carbs_complex' },
      { name: 'cream cheese light', portion: '1 colher de sopa', category: 'protein' },
      { name: 'abacate', portion: '1/2 unidade pequena', category: 'healthy_fats' },
      { name: 'chá verde', portion: '1 xícara', category: 'beverages' },
      { name: 'maçã', portion: '1 unidade pequena', category: 'fruit' }
    ]
  },
  morning_snack: {
    targetCalories: 150,
    requiredCategories: ['protein', 'carbs_complex'],
    examples: [
      { name: 'iogurte natural desnatado', portion: '1 unidade', category: 'protein' },
      { name: 'granola sem açúcar', portion: '1 colher de sopa', category: 'carbs_complex' }
    ]
  },
  lunch: {
    targetCalories: 400,
    requiredCategories: ['carbs_complex', 'protein', 'vegetables', 'healthy_fats'],
    examples: [
      { name: 'arroz integral', portion: '1 xícara', category: 'carbs_complex' },
      { name: 'feijão preto', portion: '1/2 xícara', category: 'protein' },
      { name: 'brócolis', portion: '1 xícara', category: 'vegetables' },
      { name: 'azeite de oliva', portion: '1 colher de sopa', category: 'healthy_fats' }
    ]
  },
  afternoon_snack: {
    targetCalories: 150,
    requiredCategories: ['fruit', 'healthy_fats'],
    examples: [
      { name: 'banana', portion: '1 unidade média', category: 'fruit' },
      { name: 'manteiga de amendoim', portion: '1 colher de sopa', category: 'healthy_fats' }
    ]
  },
  dinner: {
    targetCalories: 300,
    requiredCategories: ['carbs_complex', 'protein', 'vegetables', 'healthy_fats'],
    examples: [
      { name: 'quinoa', portion: '1 xícara', category: 'carbs_complex' },
      { name: 'grão-de-bico', portion: '1/2 xícara', category: 'protein' },
      { name: 'espinafre', portion: '1 xícara', category: 'vegetables' },
      { name: 'azeite de oliva', portion: '1 colher de sopa', category: 'healthy_fats' }
    ]
  }
};

function adjustCalorieDistribution(totalCalories: number) {
  const baseDistribution = DEFAULT_MEAL_STRUCTURE;
  const totalBaseCalories = Object.values(baseDistribution).reduce((sum, meal) => sum + meal.targetCalories, 0);
  const ratio = totalCalories / totalBaseCalories;

  return Object.entries(baseDistribution).reduce((acc, [mealType, meal]) => {
    acc[mealType] = {
      ...meal,
      targetCalories: Math.round(meal.targetCalories * ratio)
    };
    return acc;
  }, {} as typeof DEFAULT_MEAL_STRUCTURE);
}

function findBestFoodMatch(
  availableFoods: Food[],
  targetCategory: string,
  targetCalories: number,
  excludedFoods: string[] = []
): FoodWithPortion | null {
  return availableFoods
    .filter(food => 
      food.nutritional_category?.includes(targetCategory) &&
      !excludedFoods.includes(food.id)
    )
    .map(food => ({
      food,
      caloriesDiff: Math.abs(food.calories - targetCalories)
    }))
    .sort((a, b) => a.caloriesDiff - b.caloriesDiff)
    .map(({ food }) => calculatePortionSize(food, targetCalories, {
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0
    }))[0] || null;
}

function generateMealPlan(
  availableFoods: Food[],
  userPreferences: {
    dailyCalories: number;
    excludedFoods?: string[];
    healthCondition?: string;
    allergies?: string[];
  }
) {
  const adjustedMealStructure = adjustCalorieDistribution(userPreferences.dailyCalories);
  const mealPlan: Record<string, FoodWithPortion[]> = {};

  for (const [mealType, meal] of Object.entries(adjustedMealStructure)) {
    const mealFoods: FoodWithPortion[] = [];
    const caloriesPerCategory = meal.targetCalories / meal.requiredCategories.length;

    for (const category of meal.requiredCategories) {
      const foodMatch = findBestFoodMatch(
        availableFoods,
        category,
        caloriesPerCategory,
        [
          ...userPreferences.excludedFoods || [],
          ...mealFoods.map(f => f.id)
        ]
      );

      if (foodMatch) {
        mealFoods.push(foodMatch);
      }
    }

    mealPlan[mealType] = mealFoods;
  }

  return mealPlan;
}

export function optimizeMealCombinations(
  foods: Food[],
  targetCalories: number,
  macroTargets: MacroTargets,
  goal: string,
  userPreferences: {
    likedFoods?: string[];
    dislikedFoods?: string[];
    healthCondition?: string;
    allergies?: string[];
  }
): FoodWithPortion[] {
  const mealPlan = generateMealPlan(foods, {
    dailyCalories: targetCalories,
    excludedFoods: userPreferences.dislikedFoods,
    healthCondition: userPreferences.healthCondition,
    allergies: userPreferences.allergies
  });

  // Flatten all meals into a single array
  return Object.values(mealPlan).flat();
}
