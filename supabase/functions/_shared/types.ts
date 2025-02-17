
export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body' | 'cardio' | 'mobility';
export type ExerciseType = 'strength' | 'cardio' | 'mobility';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'intense';
export type WorkoutGoal = 'lose_weight' | 'maintain' | 'gain_mass';
export type HealthCondition = 'hypertension' | 'diabetes' | 'depression' | 'anxiety' | null;
export type TrainingLocation = 'gym' | 'home' | 'outdoors' | 'no_equipment';

export interface WorkoutPreferences {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: ActivityLevel;
  goal: WorkoutGoal;
  healthConditions: HealthCondition[];
  preferredExerciseTypes: ExerciseType[];
  availableEquipment: string[];
  trainingLocation?: TrainingLocation;
}
