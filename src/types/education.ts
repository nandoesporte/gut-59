
export interface Meal {
  [time: string]: string[];
}

export interface DayRoutine {
  meals: Meal;
  supplements: string[];
}

export interface Phase {
  title: string;
  description: string;
  dailyRoutine: DayRoutine[];
}

export interface OpenDaysState {
  [key: string]: boolean;
}
