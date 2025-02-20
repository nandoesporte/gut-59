
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

export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
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
  recommendations: {
    general: string;
    preworkout: string;
    postworkout: string;
    timing: string[];
  };
}
