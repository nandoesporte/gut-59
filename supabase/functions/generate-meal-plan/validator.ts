
// validator.ts - Enhanced with better type handling and logging
import { MealPlanRequest } from './types';

/**
 * Normalize food IDs to ensure they are all strings
 */
export const normalizeFoodIds = (foods: any[]): any[] => {
  if (!Array.isArray(foods)) {
    console.error('normalizeFoodIds received non-array:', typeof foods, foods);
    return [];
  }
  
  return foods.map(food => {
    if (!food) return null;
    
    // Make a copy to avoid modifying the original
    const normalizedFood = { ...food };
    
    // Ensure ID is a string
    if (normalizedFood.id !== undefined) {
      normalizedFood.id = String(normalizedFood.id);
    }
    
    return normalizedFood;
  }).filter(Boolean); // Filter out nulls
};

/**
 * Flexible validation function that accepts and normalizes various input formats
 */
export const validateAndNormalizeRequest = (body: any): MealPlanRequest => {
  console.log('[VALIDATOR] Starting validation of request body');
  
  if (!body) {
    console.error('[VALIDATOR] Request body is empty or undefined');
    throw new Error('Request body is required');
  }

  // Log the structure of what we received
  console.log('[VALIDATOR] Request body structure:', 
    Object.keys(body).map(key => `${key}: ${typeof body[key]}`).join(', ')
  );
  
  // Essential checks for user data
  if (!body.userData) {
    console.error('[VALIDATOR] userData is missing from request');
    throw new Error('userData is required');
  }

  // Log userData structure
  console.log('[VALIDATOR] userData fields:', 
    Object.keys(body.userData).map(key => `${key}: ${typeof body.userData[key]}`).join(', ')
  );

  // Check selected foods
  if (!body.selectedFoods || !Array.isArray(body.selectedFoods)) {
    console.error('[VALIDATOR] selectedFoods is missing or not an array:', body.selectedFoods);
    body.selectedFoods = []; // Initialize as empty array to prevent errors
  }
  
  console.log(`[VALIDATOR] selectedFoods length: ${body.selectedFoods.length}`);
  
  if (body.selectedFoods.length > 0) {
    console.log('[VALIDATOR] First food item structure:', 
      Object.keys(body.selectedFoods[0]).map(key => `${key}: ${typeof body.selectedFoods[0][key]}`).join(', ')
    );
  }

  // Process and validate foodsByMealType (flexible handling)
  const foodsByMealType: Record<string, any[]> = {};
  
  if (body.foodsByMealType && typeof body.foodsByMealType === 'object') {
    console.log('[VALIDATOR] foodsByMealType keys:', Object.keys(body.foodsByMealType).join(', '));
    
    // Process each meal type
    for (const mealType in body.foodsByMealType) {
      const mealFoods = body.foodsByMealType[mealType];
      
      console.log(`[VALIDATOR] Checking ${mealType} foods:`, 
        Array.isArray(mealFoods) ? `array of ${mealFoods.length} items` : typeof mealFoods
      );
      
      if (Array.isArray(mealFoods)) {
        foodsByMealType[mealType] = normalizeFoodIds(mealFoods);
        
        if (foodsByMealType[mealType].length > 0) {
          console.log(`[VALIDATOR] First ${mealType} food after normalization:`, foodsByMealType[mealType][0]);
        }
      } else {
        console.warn(`[VALIDATOR] Invalid format for ${mealType} foods, initializing as empty array`);
        foodsByMealType[mealType] = [];
      }
    }
  } else {
    console.warn('[VALIDATOR] foodsByMealType is missing or invalid, creating empty structure');
    // Initialize empty meal type arrays if missing
    foodsByMealType.breakfast = [];
    foodsByMealType.lunch = [];
    foodsByMealType.snack = [];
    foodsByMealType.dinner = [];
  }

  // Ensure we have normalized userData
  const normalizedUserData = {
    id: String(body.userData.id || ''),
    weight: Number(body.userData.weight) || 70,
    height: Number(body.userData.height) || 170,
    age: Number(body.userData.age) || 30,
    gender: body.userData.gender === 'female' ? 'female' : 'male',
    activityLevel: body.userData.activityLevel || 'moderate',
    goal: body.userData.goal || 'maintain',
    dailyCalories: Number(body.userData.dailyCalories) || 2000
  };

  // Normalize dietary preferences
  const dietaryPreferences = {
    hasAllergies: Boolean(body.dietaryPreferences?.hasAllergies),
    allergies: Array.isArray(body.dietaryPreferences?.allergies) 
      ? body.dietaryPreferences.allergies 
      : [],
    dietaryRestrictions: Array.isArray(body.dietaryPreferences?.dietaryRestrictions) 
      ? body.dietaryPreferences.dietaryRestrictions 
      : [],
    trainingTime: body.dietaryPreferences?.trainingTime || null
  };

  // Normalize options with defaults
  const options = {
    agentVersion: body.options?.agentVersion || "standard",
    includeRecipes: Boolean(body.options?.includeRecipes),
    useSimplifiedTerms: Boolean(body.options?.useSimplifiedTerms),
    followNutritionalGuidelines: body.options?.followNutritionalGuidelines !== false,
    optimizeForMacros: Boolean(body.options?.optimizeForMacros),
    enhanceNutritionalVariety: Boolean(body.options?.enhanceNutritionalVariety)
  };

  // Normalize the entire selected foods array
  const normalizedSelectedFoods = normalizeFoodIds(body.selectedFoods);

  console.log('[VALIDATOR] Validation complete, returning normalized request');
  
  return {
    userData: normalizedUserData,
    selectedFoods: normalizedSelectedFoods,
    foodsByMealType,
    dietaryPreferences,
    options
  };
};
