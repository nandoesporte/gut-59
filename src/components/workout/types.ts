export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body' | 'cardio' | 'mobility';
export type ExerciseType = 'strength' | 'cardio' | 'mobility';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'intense';
export type WorkoutGoal = 'lose_weight' | 'maintain' | 'gain_mass';
export type HealthCondition = 'hypertension' | 'diabetes' | 'depression' | 'anxiety' | null;
export type TrainingLocation = 'gym' | 'home' | 'outdoors' | 'no_equipment';

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  difficulty: ExerciseDifficulty;
  muscleGroup: MuscleGroup;
  exerciseType: ExerciseType;
  gifUrl: string | null;
  equipmentNeeded: string[];
  alternativeExercises: string[];
  minSets: number;
  maxSets: number;
  minReps: number;
  maxReps: number;
  restTimeSeconds: number;
}

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

export interface WorkoutPlan {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  goal: WorkoutGoal;
  sessions: WorkoutSession[];
}

export interface WorkoutSession {
  id: string;
  planId: string;
  dayNumber: number;
  warmupDescription: string;
  cooldownDescription: string;
  exercises: SessionExercise[];
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exercise: Exercise;
  sets: number;
  reps: number;
  restTimeSeconds: number;
  orderInSession: number;
}

export interface WorkoutProgress {
  id: string;
  userId: string;
  exerciseId: string;
  sessionId: string;
  setsCompleted: number;
  repsCompleted: number;
  weightUsed: number | null;
  difficultyRating: number | null;
  notes: string | null;
  date: string;
}
