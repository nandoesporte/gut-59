
import { MealPlan } from "../types";

export interface MealPlanItem {
  id: string;
  created_at: string;
  plan_data: MealPlan;
  calories: number;
}

export interface MealPlanHistoryProps {
  isLoading: boolean;
  historyPlans?: MealPlanItem[];
  onRefresh: () => Promise<void>;
}
