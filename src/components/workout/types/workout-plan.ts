interface Exercise {
  id: string;
  name: string;
  gif_url?: string;
  description?: string;
  muscle_group?: string;
  exercise_type?: string;
}

export interface SessionExercise {
  id: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  exercise: Exercise;
  intensity?: string;
  recommended_weight?: string;
}

export interface WorkoutSession {
  id: string;
  day_number: number;
  day_name?: string;
  focus?: string;
  intensity?: string;
  warmup_description: string;
  cooldown_description: string;
  session_exercises: SessionExercise[];
  training_load?: {
    intensity?: string;
    volume?: string;
    progression?: string;
  };
}

interface Critique {
  strengths?: string[];
  suggestions?: string[];
  notes?: string;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  created_at: string;
  workout_sessions: WorkoutSession[];
  critique?: Critique;
}
