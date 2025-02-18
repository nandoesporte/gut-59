
export interface WorkoutPlan {
  id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  goal: string;
  workout_sessions: Array<WorkoutSession>;
}

export interface WorkoutSession {
  id: string;
  day_number: number;
  warmup_description: string;
  exercises: Array<WorkoutExercise>;
  cooldown_description: string;
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  gifUrl?: string;
}

export interface WorkoutHistory {
  id: string;
  start_date: string;
  end_date: string;
  goal: string;
  workout_sessions: Array<{
    id: string;
    day_number: number;
    warmup_description: string;
    cooldown_description: string;
    session_exercises: Array<{
      id: string;
      exercises: {
        name: string;
        gif_url?: string;
      };
      sets: number;
      reps: number;
      rest_time_seconds: number;
    }>;
  }>;
}
