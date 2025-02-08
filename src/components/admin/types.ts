
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
