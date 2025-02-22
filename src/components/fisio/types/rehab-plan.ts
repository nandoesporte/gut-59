
import { RehabGoal } from ".";

export interface RehabSession {
  day_number: number;
  warmup_description: string;
  cooldown_description: string;
  exercises: {
    name: string;
    sets: number;
    reps: number;
    rest_time_seconds: number;
    gifUrl?: string;
    notes?: string;
  }[];
}

export interface RehabPlan {
  id: string;
  user_id: string;
  goal: RehabGoal;
  start_date: string;
  end_date: string;
  rehab_sessions: RehabSession[];
}
