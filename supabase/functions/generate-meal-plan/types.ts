
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
  fiber: number;
  food_group_id: number;
  serving_size: number;
  serving_unit: string;
  meal_type?: string[];
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
