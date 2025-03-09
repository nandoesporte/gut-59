
import { MealPlan, DayPlan, MealData, Food } from "../types";

/**
 * Ensures that lunch and dinner meals include a salad
 * @param mealPlan The meal plan to enhance
 * @returns Enhanced meal plan with salads in lunch and dinner
 */
export const addSaladsToMeals = (mealPlan: MealPlan): MealPlan => {
  if (!mealPlan.weeklyPlan) return mealPlan;

  // Deep clone to avoid mutating the original object
  const enhancedMealPlan = JSON.parse(JSON.stringify(mealPlan)) as MealPlan;
  
  // Basic salad to add if none is present
  const basicSalad: Food = {
    name: "Salada verde mista",
    portion: 100,
    unit: "g",
    details: "Mix de folhas verdes (alface, rúcula, agrião) com tomate e pepino, temperada com azeite, sal e limão."
  };

  // Basic nutritional values for the salad
  const saladNutrition = {
    calories: 45,
    protein: 2,
    carbs: 5,
    fats: 3,
    fiber: 3
  };

  // Process each day in the weekly plan
  Object.keys(enhancedMealPlan.weeklyPlan).forEach(dayKey => {
    const day = enhancedMealPlan.weeklyPlan[dayKey] as DayPlan;
    
    // Check and add salad to lunch if needed
    if (day.meals.lunch) {
      const hasSalad = day.meals.lunch.foods.some(food => 
        food.name.toLowerCase().includes("salada") || 
        food.details.toLowerCase().includes("salada") ||
        food.name.toLowerCase().includes("folhas") ||
        food.details.toLowerCase().includes("folhas") ||
        food.name.toLowerCase().includes("alface") ||
        food.details.toLowerCase().includes("alface") ||
        food.name.toLowerCase().includes("rúcula") ||
        food.details.toLowerCase().includes("rúcula")
      );
      
      if (!hasSalad) {
        // Add salad to lunch
        day.meals.lunch.foods.push({ ...basicSalad });
        
        // Update meal macros
        day.meals.lunch.calories += saladNutrition.calories;
        day.meals.lunch.macros.protein += saladNutrition.protein;
        day.meals.lunch.macros.carbs += saladNutrition.carbs;
        day.meals.lunch.macros.fats += saladNutrition.fats;
        day.meals.lunch.macros.fiber += saladNutrition.fiber;
        
        // Update day totals
        day.dailyTotals.calories += saladNutrition.calories;
        day.dailyTotals.protein += saladNutrition.protein;
        day.dailyTotals.carbs += saladNutrition.carbs;
        day.dailyTotals.fats += saladNutrition.fats;
        day.dailyTotals.fiber += saladNutrition.fiber;
      }
    }
    
    // Check and add salad to dinner if needed
    if (day.meals.dinner) {
      const hasSalad = day.meals.dinner.foods.some(food => 
        food.name.toLowerCase().includes("salada") || 
        food.details.toLowerCase().includes("salada") ||
        food.name.toLowerCase().includes("folhas") ||
        food.details.toLowerCase().includes("folhas") ||
        food.name.toLowerCase().includes("alface") ||
        food.details.toLowerCase().includes("alface") ||
        food.name.toLowerCase().includes("rúcula") ||
        food.details.toLowerCase().includes("rúcula")
      );
      
      if (!hasSalad) {
        // Add salad to dinner
        day.meals.dinner.foods.push({ ...basicSalad });
        
        // Update meal macros
        day.meals.dinner.calories += saladNutrition.calories;
        day.meals.dinner.macros.protein += saladNutrition.protein;
        day.meals.dinner.macros.carbs += saladNutrition.carbs;
        day.meals.dinner.macros.fats += saladNutrition.fats;
        day.meals.dinner.macros.fiber += saladNutrition.fiber;
        
        // Update day totals
        day.dailyTotals.calories += saladNutrition.calories;
        day.dailyTotals.protein += saladNutrition.protein;
        day.dailyTotals.carbs += saladNutrition.carbs;
        day.dailyTotals.fats += saladNutrition.fats;
        day.dailyTotals.fiber += saladNutrition.fiber;
      }
    }
  });

  // Recalculate weekly totals
  const days = Object.values(enhancedMealPlan.weeklyPlan);
  const dayCount = days.length;
  
  if (dayCount > 0) {
    enhancedMealPlan.weeklyTotals = {
      averageCalories: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.calories, 0) / dayCount),
      averageProtein: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.protein, 0) / dayCount),
      averageCarbs: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.carbs, 0) / dayCount),
      averageFats: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.fats, 0) / dayCount),
      averageFiber: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.fiber, 0) / dayCount)
    };
  }

  return enhancedMealPlan;
};
