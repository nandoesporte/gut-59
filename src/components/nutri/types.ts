
export interface NutriPreferences {
  weight: number;
  height: number;
  age: number;
  gender: "male" | "female";
  activityLevel: "sedentary" | "light" | "moderate" | "intense";
  goal: "lose" | "maintain" | "gain";
  healthCondition: "hypertension" | "diabetes" | "depression_anxiety" | null;
  selectedFoods: string[];
  hasAllergies: boolean;
  allergies: string[];
  trainingTime?: string;
}

export interface NutriPlan {
  mealPlan: {
    breakfast: MealData;
    morningSnack: MealData;
    lunch: MealData;
    afternoonSnack: MealData;
    dinner: MealData;
  };
  totalNutrition: NutritionData;
  recommendations: {
    general: string;
    timing: string[];
    healthCondition?: string;
  };
}

export interface MealData {
  items: FoodItem[];
  totalCalories: number;
  macros: MacroNutrients;
}

export interface FoodItem {
  name: string;
  quantity: string;
  calories: number;
  macros: MacroNutrients;
}

export interface MacroNutrients {
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}
