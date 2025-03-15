
export interface WorkoutPreferences {
  age: number;
  weight: number;
  height: number;
  gender: "male" | "female";
  goal: "lose_weight" | "maintain" | "gain_mass";
  activity_level: ActivityLevel;
  preferred_exercise_types: ExerciseType[];
  available_equipment: string[];
  health_conditions?: string[];
}

export type ActivityLevel = "sedentary" | "light" | "moderate" | "intense";
export type ExerciseType = "strength" | "cardio" | "mobility";
export type TrainingLocation = "gym" | "home" | "outdoors" | "no_equipment";

