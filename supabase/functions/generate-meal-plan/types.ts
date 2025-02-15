
export interface MacroTargets {
  protein: number;
  carbs: number;
  fats: number;
}

export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

export interface UserData {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  userId: string;
}

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  food_group_id: number;
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
  preparation_time_minutes?: number;
  is_quick_meal?: boolean;
  glycemic_index?: number;
  fiber?: number;
  meal_type?: string[];
  serving_size?: number;
  serving_unit?: string;
  pre_workout_compatible?: boolean;
  post_workout_compatible?: boolean;
  common_allergens?: string[];
  dietary_flags?: string[];
}

export interface MealPlanResponse {
  dailyPlan: {
    [key: string]: {
      foods: Food[];
      calories: number;
      macros: MacroTargets;
    };
  };
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  recommendations: {
    preworkout: string;
    postworkout: string;
    general: string;
    timing: string[];
  };
}
