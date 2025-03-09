export interface Food {
  name: string;
  portion: number;
  unit: string;
  details?: string;
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

export interface MealPlan {
  weeklyPlan: Record<string, DayPlan>;
  weeklyTotals: WeeklyTotals;
  recommendations?: string[] | string;
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
}

export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}
