
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
}
