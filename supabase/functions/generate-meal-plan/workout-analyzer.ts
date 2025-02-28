
import type { Food } from './types.ts';

export function analyzeWorkoutCompatibility(
  foods: Food[],
  trainingTime: string | null,
  isPreWorkout: boolean
): Food[] {
  if (!trainingTime) return foods;

  return foods.filter(food => {
    if (isPreWorkout) {
      return food.pre_workout_compatible && 
             (food.preparation_time_minutes <= 30) && 
             (food.glycemic_index ? food.glycemic_index > 55 : true);
    } else {
      return food.post_workout_compatible;
    }
  });
}

// Adding the missing function that's being imported in index.ts
export function analyzeWorkoutSync(trainingTime: string) {
  // Parse the training time to determine optimal meal timing
  const [hours, minutes] = trainingTime.split(':').map(Number);
  const trainingHour = hours + (minutes / 60);

  // Determine pre and post workout meal windows
  const preWorkoutWindow = {
    start: Math.max(trainingHour - 2, 6), // At least 2 hours before workout, but not earlier than 6am
    end: trainingHour - 0.5 // 30 minutes before workout
  };

  const postWorkoutWindow = {
    start: trainingHour + 0.25, // 15 minutes after workout
    end: trainingHour + 1.5 // Up to 1.5 hours after workout
  };

  return {
    trainingHour,
    preWorkoutWindow,
    postWorkoutWindow,
    recommendations: {
      preWorkout: "Consumir carboidratos de fácil digestão 1-2 horas antes do treino para energia otimizada.",
      postWorkout: "Consumir proteínas e carboidratos nos 30-60 minutos após o treino para recuperação muscular."
    }
  };
}
