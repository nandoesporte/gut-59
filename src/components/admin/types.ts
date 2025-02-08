
export interface User {
  id: string;
  name: string | null;
  age: number | null;
  health_conditions: string | null;
}

export interface Symptom {
  id: string;
  user_id: string;
  created_at: string;
  discomfort_level: number | null;
  has_nausea: boolean;
  has_abdominal_pain: boolean;
  has_gas: boolean;
  has_bloating: boolean;
  notes: string | null;
}

export interface DatabaseMeal {
  id: string;
  user_id: string;
  meal_date: string;
  protocol_phase: number;
  meal_type: string;
  food_group_id: number;
  custom_food: string | null;
  created_at: string | null;
  updated_at: string | null;
  description: string | null;
  protocol_food_id: string | null;
}

export interface WaterIntake {
  id: string;
  user_id: string;
  created_at: string;
  amount_ml: number;
}

export interface ProtocolPhase {
  id: number;
  name: string;
  description: string | null;
  day_start: number;
  day_end: number;
}

export interface FoodGroup {
  id: number;
  name: string;
  display_name: string;
}

export interface MealType {
  id: number;
  name: string;
  display_name: string;
  phase: number | null;
}

export interface ProtocolFood {
  id: string;
  name: string;
  phase: number | null;
  food_group: string | null;
  phase_id: number | null;
  food_group_id: number | null;
  created_at: string | null;
}

export interface PhaseFormValues {
  name: string;
  description?: string;
  day_start: number;
  day_end: number;
}

export interface FoodGroupFormValues {
  name: string;
  display_name: string;
}

export interface MealTypeFormValues {
  name: string;
  display_name: string;
  phase: number | null;
}

export interface ProtocolFoodFormValues {
  name: string;
  phase_id: number | null;
  food_group_id: number | null;
}

export interface DayData {
  id: number;
  phase_id: number;
  day: number;
  title: string;
  description: string | null;
  content: string;
}

export interface DayFormValues {
  phase_id: number;
  day: number;
  title: string;
  description?: string;
  content: string;
}
