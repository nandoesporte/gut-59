
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import type { Food, UserData, DietaryPreferences } from "./types.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to normalize food IDs to strings
export function normalizeFoodIds(foodsByMealType: Record<string, any[]>): Record<string, string[]> {
  console.log("Normalizing food IDs in foodsByMealType", JSON.stringify(foodsByMealType));
  
  const normalized: Record<string, string[]> = {};
  
  Object.entries(foodsByMealType).forEach(([mealType, foodIds]) => {
    if (Array.isArray(foodIds)) {
      normalized[mealType] = foodIds.map(id => String(id));
    } else {
      console.warn(`Expected array for ${mealType}, got:`, typeof foodIds);
      normalized[mealType] = [];
    }
  });
  
  console.log("Normalized foodsByMealType:", JSON.stringify(normalized));
  return normalized;
}

export function validateMealPlanRequest(requestData: any): { 
  isValid: boolean; 
  userData?: UserData; 
  selectedFoods?: Food[]; 
  foodsByMealType?: Record<string, string[]>;
  preferences?: DietaryPreferences;
  error?: string;
} {
  console.log("Validating meal plan request data:", JSON.stringify({
    userDataKeys: requestData.userData ? Object.keys(requestData.userData) : 'missing',
    selectedFoodsLength: requestData.selectedFoods ? requestData.selectedFoods.length : 'missing',
    foodsByMealTypeKeys: requestData.foodsByMealType ? Object.keys(requestData.foodsByMealType) : 'missing',
    preferencesKeys: requestData.preferences ? Object.keys(requestData.preferences) : 'missing'
  }));

  // Check for required fields
  if (!requestData.userData) {
    return { isValid: false, error: "Missing userData" };
  }

  if (!requestData.selectedFoods || !Array.isArray(requestData.selectedFoods) || requestData.selectedFoods.length === 0) {
    return { isValid: false, error: "Missing or empty selectedFoods array" };
  }

  if (!requestData.foodsByMealType || typeof requestData.foodsByMealType !== 'object') {
    return { isValid: false, error: "Missing or invalid foodsByMealType" };
  }

  if (!requestData.preferences || typeof requestData.preferences !== 'object') {
    return { isValid: false, error: "Missing or invalid preferences" };
  }

  // Normalize and validate foodsByMealType
  const normalizedFoodsByMealType = normalizeFoodIds(requestData.foodsByMealType);
  
  // Convert all food IDs to strings in selectedFoods for consistency
  const normalizedSelectedFoods = requestData.selectedFoods.map((food: any) => ({
    ...food,
    id: String(food.id)
  }));

  // Type check userData
  const userData = requestData.userData as UserData;
  const requiredUserFields = ['id', 'weight', 'height', 'age', 'gender', 'activityLevel', 'goal'];
  
  for (const field of requiredUserFields) {
    if (!userData[field as keyof UserData]) {
      return { isValid: false, error: `Missing required userData field: ${field}` };
    }
  }

  // Basic type validation
  if (typeof userData.weight !== 'number' || userData.weight <= 0) {
    console.warn("Invalid weight:", userData.weight);
    userData.weight = 70; // Default weight
  }

  if (typeof userData.height !== 'number' || userData.height <= 0) {
    console.warn("Invalid height:", userData.height);
    userData.height = 170; // Default height
  }

  if (typeof userData.age !== 'number' || userData.age <= 0) {
    console.warn("Invalid age:", userData.age);
    userData.age = 30; // Default age
  }

  // Validate preferences
  const preferences = requestData.preferences as DietaryPreferences;
  if (typeof preferences.hasAllergies !== 'boolean') {
    preferences.hasAllergies = false;
  }

  if (!Array.isArray(preferences.allergies)) {
    preferences.allergies = [];
  }

  if (!Array.isArray(preferences.dietaryRestrictions)) {
    preferences.dietaryRestrictions = [];
  }

  console.log("Validation successful");
  return {
    isValid: true,
    userData,
    selectedFoods: normalizedSelectedFoods,
    foodsByMealType: normalizedFoodsByMealType,
    preferences
  };
}
