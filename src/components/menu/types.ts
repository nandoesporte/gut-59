
// Add the following export if it doesn't already exist in this file
// This ensures we have a consistent type definition for MealPlan

export interface DayPlan {
  dayName: string;
  meals: {
    breakfast: MealData;
    morningSnack: MealData;
    lunch: MealData;
    afternoonSnack: MealData;
    dinner: MealData;
  };
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

export interface MealData {
  description: string;
  foods: {
    name: string;
    portion: number;
    unit: string;
    details: string;
  }[];
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

export interface MealPlan {
  weeklyPlan: {
    monday: DayPlan;
    tuesday: DayPlan;
    wednesday: DayPlan;
    thursday: DayPlan;
    friday: DayPlan;
    saturday: DayPlan;
    sunday: DayPlan;
  };
  weeklyTotals: {
    averageCalories: number;
    averageProtein: number;
    averageCarbs: number;
    averageFats: number;
    averageFiber: number;
  };
  recommendations?: {
    general: string;
    preworkout?: string;
    postworkout?: string;
    timing: string[];
  };
  userCalories?: number;
  generatedBy?: string;
}

export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

export interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  portion_size?: number;
  portion_unit?: string;
  food_group_id?: number;
  meal_type?: string[];
}
