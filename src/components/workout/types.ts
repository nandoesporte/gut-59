
export type ActivityLevel = "sedentary" | "light" | "moderate" | "intense";
export type Goal = "lose_weight" | "maintain" | "gain_mass";
export type ExerciseType = "strength" | "cardio" | "mobility";
export type TrainingLocation = "gym" | "home" | "outdoors" | "no_equipment";
export type HealthCondition = "hypertension" | "diabetes" | "depression" | "anxiety";

export interface WorkoutPreferences {
  weight: number;
  height: number;
  age: number;
  gender: "male" | "female";
  activityLevel: ActivityLevel;
  goal: Goal;
  healthConditions?: HealthCondition[];
  preferredExerciseTypes: ExerciseType[];
  trainingLocation: TrainingLocation;
  availableEquipment: string[];
}
