
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
}

export interface MealPlan {
  totalCalories: number;
  meals: {
    [key: string]: {
      calories: number;
      foods: Array<{
        name: string;
        portion: number;
        calories: number;
        macros: {
          carbs: number;
          protein: number;
          fats: number;
        };
      }>;
    };
  };
}
