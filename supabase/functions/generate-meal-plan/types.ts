
// Food type definition
export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  portion?: number;
  portionUnit?: string;
  food_group_id?: number;
  pre_workout_compatible?: boolean;
  post_workout_compatible?: boolean;
  preparation_time_minutes?: number;
  glycemic_index?: number;
  nutritionix_data?: {
    serving_unit: string;
    serving_qty: number;
    serving_weight_grams: number;
  };
}

// User profile data type
export interface UserData {
  id: string;
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  dailyCalories?: number;
}

// Dietary preferences type
export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

// Macro targets type
export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

// Meal plan generation options
export interface MealPlanOptions {
  includeRecipes?: boolean;
  optimizeForMacros?: boolean;
  agentVersion?: string;
  followNutritionalGuidelines?: boolean;
  enhanceNutritionalVariety?: boolean;
  useSimplifiedTerms?: boolean;
}

// Meal with nutritional information
export interface Meal {
  foods: {
    name: string;
    portion: number;
    unit: string;
    details?: string;
  }[];
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  description: string;
}

// Daily meal plan structure
export interface DailyMealPlan {
  dayName: string;
  meals: {
    breakfast: Meal;
    morningSnack?: Meal;
    lunch: Meal;
    afternoonSnack?: Meal;
    dinner: Meal;
    eveningSnack?: Meal;
  };
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

// Weekly meal plan structure
export interface WeeklyMealPlan {
  monday: DailyMealPlan;
  tuesday: DailyMealPlan;
  wednesday: DailyMealPlan;
  thursday: DailyMealPlan;
  friday: DailyMealPlan;
  saturday: DailyMealPlan;
  sunday: DailyMealPlan;
}

// Complete meal plan structure
export interface MealPlan {
  weeklyPlan: WeeklyMealPlan;
  weeklyTotals: {
    averageCalories: number;
    averageProtein: number;
    averageCarbs: number;
    averageFats: number;
    averageFiber: number;
  };
  recommendations: {
    general: string;
    preworkout: string;
    postworkout: string;
    timing: string[] | string;
  };
  isDefaultPlan?: boolean;
}
