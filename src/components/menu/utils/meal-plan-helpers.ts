
/**
 * Format a date object to a readable string format
 * @param date The date to format
 * @returns Formatted date string
 */
export const formatDateToString = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Calculate total daily nutrition from meals
 * @param meals Object containing all meals for a day
 * @returns Total nutrition values
 */
export const calculateDailyNutrition = (meals: any) => {
  if (!meals) return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0
  };
  
  const result = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0
  };
  
  // Sum up nutritional values from all meals
  Object.values(meals).forEach((meal: any) => {
    if (meal && meal.macros) {
      result.calories += meal.calories || 0;
      result.protein += meal.macros.protein || 0;
      result.carbs += meal.macros.carbs || 0;
      result.fats += meal.macros.fats || 0;
      result.fiber += meal.macros.fiber || 0;
    }
  });
  
  // Round values to whole numbers
  return {
    calories: Math.round(result.calories),
    protein: Math.round(result.protein),
    carbs: Math.round(result.carbs),
    fats: Math.round(result.fats),
    fiber: Math.round(result.fiber)
  };
};
