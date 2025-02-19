
export type MuscleGroup = 
  | "weight_training"
  | "stretching"
  | "ball_exercises"
  | "resistance_band"
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "full_body"
  | "cardio"
  | "mobility";

export type ExerciseType = "strength" | "cardio" | "mobility";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  gif_url: string | null;
  muscle_group: MuscleGroup;
  exercise_type: ExerciseType;
  difficulty: Difficulty;
}

