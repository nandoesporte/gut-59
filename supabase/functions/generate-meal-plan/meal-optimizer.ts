
import { ProtocolFood, DietaryPreferences, MealPlan, MealPlanAnalysis } from './types.ts'
import { PortionCalculator } from './portion-calculator.ts'

export class MealOptimizer {
  async optimize({
    foods,
    analysis,
    dailyCalories,
    dietaryPreferences
  }: {
    foods: ProtocolFood[];
    analysis: MealPlanAnalysis;
    dailyCalories: number;
    dietaryPreferences: DietaryPreferences;
  }): Promise<MealPlan> {
    // Remover alimentos restritos
    const availableFoods = foods.filter(food => 
      !analysis.restrictedFoods.find(restricted => restricted.id === food.id)
    )

    // Distribuir alimentos por refeição
    const mealPlan: MealPlan = {
      dailyPlan: {
        breakfast: this.createMeal(availableFoods, 'breakfast', dailyCalories * 0.25),
        morningSnack: this.createMeal(availableFoods, 'morningSnack', dailyCalories * 0.15),
        lunch: this.createMeal(availableFoods, 'lunch', dailyCalories * 0.30),
        afternoonSnack: this.createMeal(availableFoods, 'afternoonSnack', dailyCalories * 0.10),
        dinner: this.createMeal(availableFoods, 'dinner', dailyCalories * 0.20)
      },
      totalNutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0
      },
      recommendations: {
        preworkout: '',
        postworkout: '',
        general: '',
        timing: []
      }
    }

    // Calcular nutrição total
    Object.values(mealPlan.dailyPlan).forEach(meal => {
      mealPlan.totalNutrition.calories += meal.calories;
      mealPlan.totalNutrition.protein += meal.macros.protein;
      mealPlan.totalNutrition.carbs += meal.macros.carbs;
      mealPlan.totalNutrition.fats += meal.macros.fats;
      mealPlan.totalNutrition.fiber += meal.macros.fiber;
    });

    return mealPlan;
  }

  private createMeal(foods: ProtocolFood[], mealType: string, targetCalories: number) {
    // Selecionar alimentos apropriados para o tipo de refeição
    const appropriateFoods = foods.filter(food => 
      food.meal_type?.includes(mealType) || food.meal_type?.includes('any')
    ).slice(0, 4) // Limitar a 4 alimentos por refeição

    // Calcular macros
    const totalCalories = appropriateFoods.reduce((sum, food) => sum + food.calories, 0)
    const ratio = targetCalories / totalCalories

    const macros = {
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0
    }

    appropriateFoods.forEach(food => {
      macros.protein += (food.protein || 0) * ratio;
      macros.carbs += (food.carbs || 0) * ratio;
      macros.fats += (food.fats || 0) * ratio;
      macros.fiber += (food.fiber || 0) * ratio;
    });

    return {
      foods: appropriateFoods,
      calories: targetCalories,
      macros: {
        protein: Math.round(macros.protein * 10) / 10,
        carbs: Math.round(macros.carbs * 10) / 10,
        fats: Math.round(macros.fats * 10) / 10,
        fiber: Math.round(macros.fiber * 10) / 10
      }
    }
  }
}
