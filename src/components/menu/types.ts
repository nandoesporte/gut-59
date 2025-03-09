
export interface Food {
  name: string;
  portion: number;
  unit: string;
  details?: string;
}

export interface MealFood extends Food {
  // Additional properties for foods that need to be replaced or modified
  id?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
}

export interface Macros {
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface Meal {
  description: string;
  foods: Food[];
  calories: number;
  macros: Macros;
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
    breakfast?: Meal;
    morningSnack?: Meal;
    lunch?: Meal;
    afternoonSnack?: Meal;
    dinner?: Meal;
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

export interface RecommendationsObject {
  general?: string | string[];
  preworkout?: string | string[];
  postworkout?: string | string[];
  timing?: string | string[];
}

export interface MealPlan {
  weeklyPlan: Record<string, DayPlan>;
  weeklyTotals: WeeklyTotals;
  recommendations?: string[] | string | RecommendationsObject;
  userCalories?: number;
  created_at?: string;
  generatedBy?: string;
}

export interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  food_group_id?: number;
  phase?: number;
  phase_id?: number;
  pre_workout_compatible?: boolean;
  post_workout_compatible?: boolean;
  portion_size?: number;
  portion_unit?: string;
  serving_size?: number;
  serving_unit?: string;
}

export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

export interface CalorieCalculatorForm {
  age: number;
  weight: number;
  height: number;
  gender: "male" | "female";
  activity_level: string;
  activityLevel: string;
  goal: Goal;
}

export type Goal = "lose" | "maintain" | "gain";
