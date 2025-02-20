
export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  gifUrl?: string;
}

export interface WorkoutSession {
  day_number: number;
  warmup_description: string;
  cooldown_description: string;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  workout_sessions: WorkoutSession[];
}
