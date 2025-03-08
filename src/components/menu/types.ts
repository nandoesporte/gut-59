export interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  food_group_id?: number;
  food_group_name?: string;
  phase?: number;
  phase_id?: number;
  pre_workout_compatible?: boolean;
  post_workout_compatible?: boolean;
  portion_size?: number;
  portion_unit?: string;
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fats_per_100g?: number;
  fiber_per_100g?: number;
  meal_type?: string[];
}

export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime?: string;
}

export interface MealFood {
  name: string;
  portion: number;
  unit: string;
  details: string;
}

export interface MealMacros {
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface Meal {
  description: string;
  foods: MealFood[];
  calories: number;
  macros: MealMacros;
}

export interface DailyNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface DayPlan {
  dayName: string;
  meals: {
    breakfast: Meal;
    morningSnack: Meal;
    lunch: Meal;
    afternoonSnack: Meal;
    dinner: Meal;
  };
  dailyTotals: DailyNutrition;
}

export interface WeeklyTotals {
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFats: number;
  averageFiber: number;
}

export interface Recommendations {
  general: string;
  preworkout: string;
  postworkout: string;
  timing: string[];
}

export interface MealPlan {
  weeklyPlan: {
    monday: DayPlan;
    tuesday: DayPlan;
    wednesday: DayPlan;
    thursday: DayPlan;
    friday: DayPlan;
    saturday: DayPlan;
    sunday: DayPlan;
  };
  weeklyTotals: WeeklyTotals;
  recommendations: Recommendations;
  userCalories?: number;
  generatedBy?: string;
}
