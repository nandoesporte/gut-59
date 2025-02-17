
import { MealPlan } from './types.ts'

export class WorkoutAnalyzer {
  async analyze({
    mealPlan,
    trainingTime
  }: {
    mealPlan: MealPlan;
    trainingTime: string | null;
  }): Promise<MealPlan> {
    if (!trainingTime) {
      return mealPlan;
    }

    // Converter o horário de treino para um objeto Date
    const training = new Date(`2000-01-01T${trainingTime}`);
    const trainingHour = training.getHours();

    // Ajustar as refeições com base no horário de treino
    if (trainingHour < 10) {
      // Treino pela manhã
      this.adjustMorningWorkout(mealPlan);
    } else if (trainingHour < 16) {
      // Treino à tarde
      this.adjustAfternoonWorkout(mealPlan);
    } else {
      // Treino à noite
      this.adjustEveningWorkout(mealPlan);
    }

    return mealPlan;
  }

  private adjustMorningWorkout(mealPlan: MealPlan) {
    // Café da manhã leve
    this.reduceMealIntensity(mealPlan.dailyPlan.breakfast);
    
    // Aumentar carboidratos no pré-treino
    this.increaseMealIntensity(mealPlan.dailyPlan.morningSnack, 'carbs');
    
    // Refeição pós-treino mais substancial
    this.increaseMealIntensity(mealPlan.dailyPlan.lunch, 'protein');
  }

  private adjustAfternoonWorkout(mealPlan: MealPlan) {
    // Almoço mais leve
    this.reduceMealIntensity(mealPlan.dailyPlan.lunch);
    
    // Lanche pré-treino com foco em carboidratos
    this.increaseMealIntensity(mealPlan.dailyPlan.afternoonSnack, 'carbs');
    
    // Jantar com mais proteína para recuperação
    this.increaseMealIntensity(mealPlan.dailyPlan.dinner, 'protein');
  }

  private adjustEveningWorkout(mealPlan: MealPlan) {
    // Manter café da manhã e almoço normais
    // Lanche da tarde com mais carboidratos
    this.increaseMealIntensity(mealPlan.dailyPlan.afternoonSnack, 'carbs');
    
    // Jantar leve pós-treino com foco em proteína
    this.adjustPostWorkoutDinner(mealPlan.dailyPlan.dinner);
  }

  private reduceMealIntensity(meal: MealPlan['dailyPlan']['breakfast']) {
    const reduction = 0.8;
    meal.calories *= reduction;
    meal.macros.protein *= reduction;
    meal.macros.carbs *= reduction;
    meal.macros.fats *= reduction;
  }

  private increaseMealIntensity(
    meal: MealPlan['dailyPlan']['breakfast'],
    focus: 'protein' | 'carbs'
  ) {
    const increase = 1.2;
    meal.calories *= increase;
    
    if (focus === 'protein') {
      meal.macros.protein *= increase * 1.2;
      meal.macros.carbs *= increase * 0.8;
    } else {
      meal.macros.protein *= increase * 0.8;
      meal.macros.carbs *= increase * 1.2;
    }
    
    meal.macros.fats *= 0.8; // Reduzir gorduras em refeições próximas ao treino
  }

  private adjustPostWorkoutDinner(meal: MealPlan['dailyPlan']['dinner']) {
    // Ajustar para uma refeição leve mas rica em proteínas
    meal.calories *= 0.9;
    meal.macros.protein *= 1.2;
    meal.macros.carbs *= 0.8;
    meal.macros.fats *= 0.7;
  }
}
