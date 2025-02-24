
export interface StepData {
  steps: number;
  distance: number;
  calories: number;
}

export interface AccelerometerState {
  isInitialized: boolean;
  hasPermission: boolean;
  lastInitTime: number;
}

export const STEP_CONSTANTS = {
  STEPS_GOAL: 10000,
  STEP_LENGTH: 0.762, // metros
  CALORIES_PER_STEP: 0.04,
  ACCELERATION_THRESHOLD: 10,
  MIN_TIME_BETWEEN_STEPS: 250, // milissegundos
  STORAGE_KEY: 'stepCounter',
  ACCELEROMETER_STATE_KEY: 'accelerometerState',
  MAX_RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 1000,
} as const;
