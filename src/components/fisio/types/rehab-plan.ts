
import { RehabGoal } from ".";

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  gifUrl?: string | null;
  notes?: string | null;
}

export interface RehabSession {
  day_number: number;
  warmup_description: string;
  cooldown_description: string;
  exercises: Exercise[];
}

export interface RehabPlan {
  id: string;
  user_id: string;
  goal: RehabGoal;
  condition?: string;
  start_date: string;
  end_date: string;
  rehab_sessions: RehabSession[];
  
  // Adding plan_data property to fix the type errors
  plan_data?: {
    days: Record<string, any>;
    overview: {
      title?: string;
      goals?: string[];
      recommendations?: string[];
      general_recommendations?: string[];
      pain_management?: string[];
      warning_signs?: string[];
    };
  };
  
  // These properties are derived from plan_data, but kept for backward compatibility
  days?: Record<string, any>;
  overview?: any;
  recommendations?: string[] | string;
}
