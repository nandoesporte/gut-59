export interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  food_group_id: number;
  portion_size: number;
  portion_unit?: string;
  serving_unit: string;
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

export interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

export interface FoodSubstitution {
  originalFood: ProtocolFood;
  alternatives: ProtocolFood[];
  similarityScore: number;
}

export interface MealPlan {
  dailyPlan: {
    breakfast: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
      };
    };
    morningSnack: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
      };
    };
    lunch: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
      };
    };
    afternoonSnack: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
      };
    };
    dinner: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
      };
    };
  };
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
    healthCondition?: "hipertensao" | "diabetes" | "depressao_ansiedade" | null;
    substitutions?: FoodSubstitution[];
  };
  nutritionalAnalysis?: {
    carbsPercentage: number;
    proteinPercentage: number;
    fatsPercentage: number;
    fiberAdequate: boolean;
    vitaminsComplete: boolean;
    mineralsComplete: boolean;
  };
}

export interface WeeklyMealPlan {
  weekStartDate: string;
  dailyPlans: {
    [key: string]: MealPlan;
  };
  nutritionalAnalysis: {
    averageMacroDistribution: {
      carbs: number;
      protein: number;
      fats: number;
    };
    varietyScore: number;
  };
}

export interface NutritionPreferences {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'intense';
  goal: 'lose_weight' | 'maintain' | 'gain_mass';
  healthCondition?: 'hypertension' | 'diabetes' | 'depression_anxiety' | null;
  dietaryPreferences: string[];
  allergies: string[];
}

export interface NutritionPlan {
  id: string;
  userId: string;
  caloricNeeds: number;
  mealPlan: MealPlan;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
}
