
export interface WorkoutPreferences {
  goal: string;
  frequency: number;
  duration: number;
  activityLevel: string;
  muscleGroup: string;
  experienceLevel: string;
  equipment: string[];
  trainingLocation: string;
}

export type ActivityLevel = "sedentary" | "light" | "moderate" | "intense";
export type ExerciseType = "strength" | "cardio" | "mobility";
