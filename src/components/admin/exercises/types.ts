
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
  equipment_needed?: string[];
  alternative_exercises?: string[];
  max_reps?: number;
  min_reps?: number;
  max_sets?: number;
  min_sets?: number;
  rest_time_seconds?: number;
  goals?: string[];
  // Novos campos para análise de IA
  preparation_time_minutes?: number;
  is_compound_movement?: boolean;
  target_heart_rate_zone?: string[];
  primary_muscles_worked?: string[];
  secondary_muscles_worked?: string[];
  movement_pattern?: string;
  equipment_complexity?: string;
  mobility_requirements?: string;
  typical_duration_seconds?: number;
  calories_burned_per_hour?: number;
  recommended_warm_up?: string;
  common_mistakes?: string[];
  safety_considerations?: string[];
  progression_variations?: string[];
  regression_variations?: string[];
  suitable_for_conditions?: string[];
  contraindicated_conditions?: string[];
  training_phases?: string[];
  tempo_recommendation?: string;
  breathing_pattern?: string;
  stability_requirement?: string;
  balance_requirement?: string;
  coordination_requirement?: string;
  flexibility_requirement?: string;
  power_requirement?: string;
}
