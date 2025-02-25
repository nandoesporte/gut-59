
import type { CalorieCalculatorForm } from "../CalorieCalculator";
import type { DietaryPreferences, MealPlan } from "../types";

export interface MenuState {
  currentStep: number;
  dietaryPreferences: DietaryPreferences | null;
  mealPlan: MealPlan | null;
  loading: boolean;
  formData: CalorieCalculatorForm;
}

export interface MenuActions {
  setCurrentStep: (step: number) => void;
  setFormData: (formData: CalorieCalculatorForm) => void;
}
