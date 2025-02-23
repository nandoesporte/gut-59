export interface User {
  id: string;
  name: string | null;
  age: number | null;
  health_conditions: string | null;
  email: string | null;
  unread_messages?: number;
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
  meal_date: string | null;
  protocol_phase: number;
  meal_type: string;
  food_group_id: number;
  custom_food: string | null;
  created_at: string | null;
  updated_at: string | null;
  description: string | null;
  protocol_food_id: string | null;
  photo_url: string | null;
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

export interface UserDetails extends User {
  meals: DatabaseMeal[];
  symptoms: Symptom[];
  water_intake: WaterIntake[];
  education_progress: EducationProgress[];
}

export interface EducationProgress {
  id: string;
  user_id: string;
  phase: number | null;
  day: number | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingModule {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface TrainingVideo {
  id: string;
  title: string;
  description: string | null;
  module_id: string;
  url: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface TrainingModuleFormValues {
  name: string;
  description?: string;
  display_order: number;
  status: 'active' | 'inactive';
}

export interface TrainingVideoFormValues {
  title: string;
  description?: string;
  module_id: string;
  url: string;
  status: 'active' | 'inactive';
}

export interface Professional {
  id: string;
  name: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ProfessionalFormValues {
  name: string;
  title: string;
  description?: string;
  photo_url?: string;
  display_order: number;
  status: 'active' | 'inactive';
}
