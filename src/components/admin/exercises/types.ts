
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
export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";

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

export type PhysioJointArea = 
  | "ankle_foot"
  | "leg"
  | "knee"
  | "hip"
  | "spine"
  | "shoulder"
  | "elbow_hand";

export type PhysioCondition =
  | "plantar_fasciitis"
  | "calcaneal_spur"
  | "ankle_sprain"
  | "anterior_compartment"
  | "shin_splints"
  | "achilles_tendinitis"
  | "patellofemoral"
  | "patellar_tendinitis"
  | "acl_postop"
  | "mcl_injury"
  | "meniscus_injury"
  | "knee_arthrosis"
  | "trochanteric_bursitis"
  | "piriformis_syndrome"
  | "sports_hernia"
  | "it_band_syndrome"
  | "disc_protrusion"
  | "herniated_disc"
  | "cervical_lordosis"
  | "frozen_shoulder"
  | "shoulder_bursitis"
  | "rotator_cuff"
  | "impingement"
  | "medial_epicondylitis"
  | "lateral_epicondylitis"
  | "carpal_tunnel";

export interface PhysioExercise {
  name: string;
  description?: string;
  gif_url?: string;
  joint_area: PhysioJointArea;
  condition: PhysioCondition;
  exercise_type: ExerciseType;
  difficulty: Difficulty;
  is_compound_movement?: boolean;
  required_equipment?: string[];
  balance_requirement?: string;
  coordination_requirement?: string;
  strength_requirement?: string;
  flexibility_requirement?: string;
  movement_speed?: string;
  resistance_level?: string;
  pain_level_threshold?: number;
  progression_level?: number;
  recommended_repetitions?: number;
  recommended_sets?: number;
  hold_time_seconds?: number;
  rest_time_seconds?: number;
  keywords?: string[];
  primary_goals?: string[];
  target_symptoms?: string[];
}
