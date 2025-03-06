export interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  food_group_id: number | null;
  portion?: number;
  portionUnit?: string;
  fiber?: number;
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
  nutritionix_data?: {
    serving_unit: string;
    serving_qty: number;
    serving_weight_grams: number;
  };
  phase?: number | null;
  portion_size?: number | null;
  portion_unit?: string | null;
  pre_workout_compatible?: boolean | null;
  post_workout_compatible?: boolean | null;
  protein_per_100g?: number | null;
  carbs_per_100g?: number | null;
  fats_per_100g?: number | null;
}

export interface MealFood {
  name: string;
  portion: number;
  unit: string;
  details: string;
}

export interface Meal {
  description: string;
  foods: MealFood[];
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

export interface DailyPlan {
  dayName: string;
  meals: {
    breakfast: Meal;
    morningSnack: Meal;
    lunch: Meal;
    afternoonSnack: Meal;
    dinner: Meal;
  };
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

export interface WeeklyTotals {
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFats: number;
  averageFiber: number;
}

export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

export interface MealPlan {
  userCalories?: number; // Added this property to fix the TypeScript error
  weeklyPlan: {
    monday: DailyPlan;
    tuesday: DailyPlan;
    wednesday: DailyPlan;
    thursday: DailyPlan;
    friday: DailyPlan;
    saturday: DailyPlan;
    sunday: DailyPlan;
  };
  weeklyTotals: WeeklyTotals;
  recommendations: {
    general: string;
    preworkout: string;
    postworkout: string;
    timing: string[];
  };
}
