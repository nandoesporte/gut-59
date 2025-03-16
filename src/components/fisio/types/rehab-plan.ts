
import { RehabGoal } from ".";

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  gifUrl?: string | null;
  notes?: string | null;
  description?: string | null;
}

export interface RehabSession {
  day_number: number;
  warmup_description: string;
  cooldown_description: string;
  exercises: Exercise[];
  notes?: string | null;
}

export interface RehabPlan {
  id?: string;
  user_id?: string;
  goal?: RehabGoal;
  condition?: string;
  joint_area?: string;
  start_date?: string;
  end_date?: string;
  rehab_sessions?: RehabSession[];
  
  // Adding properties used in the display component
  days?: Record<string, any>;
  overview?: string;
  recommendations?: string[] | string;
  description?: string;
  general_recommendations?: string[] | string;
  exercises?: Exercise[];
  plan_data?: any;
}
