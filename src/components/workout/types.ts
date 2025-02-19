
export interface WorkoutPreferences {
  age: number;
  weight: number;
  height: number;
  gender: "male" | "female";
  goal: string;
  frequency: number;
  duration: number;
  activityLevel: string;
  muscleGroup: string;
  experienceLevel: string;
  equipment: string[];
  trainingLocation: string;
  preferredExerciseTypes: ExerciseType[];
}

export type ActivityLevel = "sedentary" | "light" | "moderate" | "intense";
export type ExerciseType = "strength" | "cardio" | "mobility";
