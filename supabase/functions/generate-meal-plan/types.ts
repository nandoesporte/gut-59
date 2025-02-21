
export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portion?: number;
  portionUnit?: string;
  food_group_id?: number;
}

export interface FoodWithPortion extends Food {
  portion: number;
  portionUnit: string;
}

export interface MacroTargets {
  protein: number;
  carbs: number;
  fats: number;
}

export interface Meal {
  foods: FoodWithPortion[];
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
  };
}

export interface MealPlan {
  dailyPlan: {
    breakfast?: Meal;
    morningSnack?: Meal;
    lunch?: Meal;
    afternoonSnack?: Meal;
    dinner?: Meal;
  };
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
  };
  recommendations: string[];
}
