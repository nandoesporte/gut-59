
export interface MacroTargets {
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  food_group_id?: number;
  portion?: number;
  portionUnit?: string;
  nutritional_category?: string[];
  substitution_group?: string;
  nutritionix_data?: {
    serving_unit: string;
    serving_qty: number;
    serving_weight_grams: number;
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

export interface MealPlanResult {
  breakfast: FoodWithPortion[];
  morning_snack: FoodWithPortion[];
  lunch: FoodWithPortion[];
  afternoon_snack: FoodWithPortion[];
  dinner: FoodWithPortion[];
  nutritionalAnalysis: {
    totalCalories: number;
    macroDistribution: {
      protein: number;
      carbs: number;
      fats: number;
      fiber: number;
    };
  };
}

export interface UserData {
  id?: string;
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  userId?: string;
  dailyCalories: number;
}

export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

export interface MealPlanOptions {
  agentVersion?: string;
  includeRecipes?: boolean;
  followNutritionalGuidelines?: boolean;
  optimizeForMacros?: boolean;
  enhanceNutritionalVariety?: boolean;
  useSimplifiedTerms?: boolean;
}

export interface MealPlanRequestPayload {
  userData: UserData;
  selectedFoods: Food[];
  foodsByMealType?: Record<string, Food[]>;
  dietaryPreferences: DietaryPreferences;
  options?: MealPlanOptions;
}
