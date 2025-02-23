
interface Exercise {
  id: string;
  name: string;
  gif_url?: string;
  description?: string;
}

interface SessionExercise {
  id: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  exercise: Exercise;
}

export interface WorkoutSession {
  id: string;
  day_number: number;
  warmup_description: string;
  cooldown_description: string;
  session_exercises: SessionExercise[];
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  workout_sessions: WorkoutSession[];
}
