
export interface MacroTargets {
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
  preferAutomatic: boolean; // Nova flag para cardápio automático
  excludedFoods: string[]; // Alimentos que o usuário não gosta
}

export interface UserData {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  userId: string;
  lastFeedback?: {
    likedFoods: string[];
    dislikedFoods: string[];
    date: string;
  };
}

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  food_group_id: number;
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
  preparation_time_minutes?: number;
  is_quick_meal?: boolean;
  glycemic_index?: number;
  meal_type?: string[];
  serving_size: number;
  serving_unit: string;
  pre_workout_compatible?: boolean;
  post_workout_compatible?: boolean;
  common_allergens?: string[];
  dietary_flags?: string[];
  substitutes?: string[]; // IDs de alimentos que podem substituir
}

export interface MealPlanResponse {
  dailyPlan: {
    [key: string]: {
      foods: FoodWithPortion[];
      calories: number;
      macros: MacroTargets;
    };
  };
  weeklyPlan?: WeeklyPlan;
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  recommendations: {
    preworkout: string;
    postworkout: string;
    general: string;
    timing: string[];
    substitutions: Array<{
      foodId: string;
      alternatives: Food[];
    }>;
  };
}

export interface FoodWithPortion extends Food {
  portion: number;
  portionUnit: string;
  calculatedNutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

export interface WeeklyPlan {
  [key: string]: {
    breakfast: FoodWithPortion[];
    morningSnack: FoodWithPortion[];
    lunch: FoodWithPortion[];
    afternoonSnack: FoodWithPortion[];
    dinner: FoodWithPortion[];
  };
}
