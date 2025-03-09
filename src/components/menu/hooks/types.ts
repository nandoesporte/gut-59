
import type { DietaryPreferences, MealPlan } from "../types";

export interface MenuState {
  currentStep: number;
  dietaryPreferences: DietaryPreferences | null;
  mealPlan: MealPlan | null;
  loading: boolean;
  formData: any; // We'll use the CalorieCalculatorForm from ../types.ts instead
}

export interface MenuActions {
  setCurrentStep: (step: number) => void;
  setFormData: (formData: any) => void;
}
