
export interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  food_group_id: number;
  portion?: number;
  portionUnit?: string;
  description?: string;
  calculatedNutrients?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  vitamins_minerals?: Record<string, number>;
  substitution_group?: string;
  nutritional_category?: string[];
}

export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

export interface MealPlanAnalysis {
  macroDistribution: {
    protein: number;
    carbs: number;
    fats: number;
  };
  restrictedFoods: ProtocolFood[];
  mealTiming: {
    breakfast: string;
    morningSnack: string;
    lunch: string;
    afternoonSnack: string;
    dinner: string;
  };
  nutritionalAdequacy: {
    hasAdequateVitamins: boolean;
    hasAdequateMinerals: boolean;
    hasAdequateFiber: boolean;
    estimatedFiberIntake: number;
  };
  healthConditionConsiderations: string[];
}

export interface MealPlan {
  dailyPlan: {
    breakfast: Meal;
    morningSnack: Meal;
    lunch: Meal;
    afternoonSnack: Meal;
    dinner: Meal;
  };
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  nutritionalAnalysis?: {
    carbsPercentage: number;
    proteinPercentage: number;
    fatsPercentage: number;
    fiberAdequate: boolean;
    vitaminsComplete: boolean;
    mineralsComplete: boolean;
  };
  recommendations: {
    preworkout: string;
    postworkout: string;
    general: string;
    timing: string[];
    healthCondition?: string | null;
    substitutions?: FoodSubstitution[];
  };
}

export interface Meal {
  foods: ProtocolFood[];
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

export interface FoodSubstitution {
  originalFood: ProtocolFood;
  alternatives: ProtocolFood[];
  similarityScore: number;
}
