
export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  gifUrl?: string;
}

export interface WorkoutSession {
  id: string;
  day_number: number;
  warmup_description: string;
  cooldown_description: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  workout_sessions: WorkoutSession[];
}

export interface WorkoutHistory extends WorkoutPlan {
  session_exercises?: Array<{
    id: string;
    exercises: {
      name: string;
      gif_url?: string;
    };
    sets: number;
    reps: number;
    rest_time_seconds: number;
  }>;
}
