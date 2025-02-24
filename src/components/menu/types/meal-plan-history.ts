
import { MealPlan } from "../types";

export interface MealPlanItem {
  id: string;
  created_at: string;
  user_id: string;
  plan_data: MealPlan;
  active: boolean;
}

export interface WeeklyMealPlan {
  monday: MealPlan;
  tuesday: MealPlan;
  wednesday: MealPlan;
  thursday: MealPlan;
  friday: MealPlan;
  saturday: MealPlan;
  sunday: MealPlan;
  recommendations: {
    general: string;
    preworkout: string;
    postworkout: string;
  };
}

export const weekDayNames = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
} as const;
