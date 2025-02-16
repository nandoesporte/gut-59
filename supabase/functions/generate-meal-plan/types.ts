
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
  preferAutomatic: boolean;
  excludedFoods: string[];
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
  healthCondition?: string;
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
  substitutes?: string[];
  nutritional_category?: string[];
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
