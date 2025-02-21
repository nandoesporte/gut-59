
import { MealPlan } from "../types";

export interface MealPlanItem {
  id: string;
  created_at: string;
  plan_data: WeeklyMealPlan;
  calories: number;
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

export interface MealPlanHistoryProps {
  isLoading: boolean;
  historyPlans?: MealPlanItem[];
  onRefresh: () => Promise<void>;
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
