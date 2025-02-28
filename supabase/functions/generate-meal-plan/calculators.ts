
import type { MacroTargets } from "./types.ts";

/**
 * Calculates daily calorie needs using the Mifflin-St Jeor equation
 * @param weight Weight in kg
 * @param height Height in cm
 * @param age Age in years
 * @param gender 'male' or 'female'
 * @param activityLevel Activity level factor
 * @returns Estimated daily calories
 */
export function calculateDailyCalories(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityLevel: string
): number {
  // Base metabolic rate (BMR) calculation using Mifflin-St Jeor Equation
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  
  // Gender adjustment
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  
  // Activity level multiplier
  const activityMultipliers: Record<string, number> = {
    'sedentary': 1.2,      // Little or no exercise
    'light': 1.375,        // Light exercise 1-3 days/week
    'moderate': 1.55,      // Moderate exercise 3-5 days/week
    'active': 1.725,       // Hard exercise 6-7 days/week
    'very_active': 1.9     // Very hard exercise & physical job or 2x training
  };
  
  const multiplier = activityMultipliers[activityLevel] || 1.55; // Default to moderate if not specified
  
  return Math.round(bmr * multiplier);
}

/**
 * Calculates macro targets based on user data and goal
 * @param userData User data including weight, height, age, gender, etc.
 * @returns Object with protein, carbs, and fat targets in grams
 */
export function calculateMacroTargets(userData: any): MacroTargets {
  // Use provided daily calories or calculate them
  const dailyCalories = userData.dailyCalories || 
    calculateDailyCalories(
      userData.weight,
      userData.height,
      userData.age,
      userData.gender,
      userData.activityLevel || 'moderate'
    );
  
  // Adjust calories based on goal
  let adjustedCalories = dailyCalories;
  
  if (userData.goal === 'lose_weight') {
    adjustedCalories = Math.round(dailyCalories * 0.85); // 15% deficit for weight loss
  } else if (userData.goal === 'gain_weight' || userData.goal === 'gain_mass') {
    adjustedCalories = Math.round(dailyCalories * 1.1); // 10% surplus for weight gain
  }
  
  // Default macro distribution (balanced)
  let proteinPercentage = 0.3; // 30% of calories from protein
  let carbsPercentage = 0.4;   // 40% of calories from carbs
  let fatsPercentage = 0.3;    // 30% of calories from fats
  
  // Adjust macros based on goal
  if (userData.goal === 'lose_weight') {
    // Higher protein, moderate fat, lower carb for weight loss
    proteinPercentage = 0.35;
    carbsPercentage = 0.35;
    fatsPercentage = 0.3;
  } else if (userData.goal === 'gain_weight' || userData.goal === 'gain_mass') {
    // Higher carb, moderate protein, moderate fat for muscle gain
    proteinPercentage = 0.25;
    carbsPercentage = 0.5;
    fatsPercentage = 0.25;
  }
  
  // Calculate grams of each macro
  // Protein: 4 calories per gram
  // Carbs: 4 calories per gram
  // Fat: 9 calories per gram
  const proteinGrams = Math.round((adjustedCalories * proteinPercentage) / 4);
  const carbsGrams = Math.round((adjustedCalories * carbsPercentage) / 4);
  const fatsGrams = Math.round((adjustedCalories * fatsPercentage) / 9);
  
  // Calculate fiber target (general recommendation: 14g per 1000 calories)
  const fiberGrams = Math.round(adjustedCalories * 0.014);
  
  return {
    calories: adjustedCalories,
    protein: proteinGrams,
    carbs: carbsGrams,
    fats: fatsGrams,
    fiber: fiberGrams
  };
}

/**
 * Calculates BMI (Body Mass Index)
 * @param weight Weight in kg
 * @param height Height in cm
 * @returns BMI value
 */
export function calculateBMI(weight: number, height: number): number {
  // Convert height from cm to meters
  const heightInMeters = height / 100;
  // BMI formula: weight (kg) / (height (m))^2
  return weight / (heightInMeters * heightInMeters);
}

/**
 * Gets BMI category based on BMI value
 * @param bmi BMI value
 * @returns BMI category description
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Peso normal";
  if (bmi < 30) return "Sobrepeso";
  if (bmi < 35) return "Obesidade Grau I";
  if (bmi < 40) return "Obesidade Grau II";
  return "Obesidade Grau III";
}

/**
 * Calculates Basal Metabolic Rate using Harris-Benedict Equation
 * @param weight Weight in kg
 * @param height Height in cm
 * @param age Age in years
 * @param gender 'male' or 'female'
 * @returns BMR value in calories
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: string
): number {
  if (gender === 'male') {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
}
