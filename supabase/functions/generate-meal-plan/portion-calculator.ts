
import { MealPlan, ProtocolFood } from './types.ts'

export class PortionCalculator {
  async calculate({
    mealPlan,
    dailyCalories
  }: {
    mealPlan: MealPlan;
    dailyCalories: number;
  }): Promise<MealPlan> {
    // Distribuição calórica por refeição
    const mealDistribution = {
      breakfast: 0.25,
      morningSnack: 0.15,
      lunch: 0.30,
      afternoonSnack: 0.10,
      dinner: 0.20
    }

    // Para cada refeição, calcular as porções
    Object.entries(mealPlan.dailyPlan).forEach(([mealType, meal]) => {
      const mealCalories = dailyCalories * mealDistribution[mealType as keyof typeof mealDistribution]
      
      // Calcular porções proporcionais
      meal.foods = this.calculatePortions(meal.foods, mealCalories)
    })

    return mealPlan
  }

  private calculatePortions(foods: ProtocolFood[], targetCalories: number): ProtocolFood[] {
    const totalCalories = foods.reduce((sum, food) => sum + food.calories, 0)
    const calorieRatio = targetCalories / totalCalories

    return foods.map(food => {
      const portion = Math.round((food.portion || 100) * calorieRatio)
      return {
        ...food,
        portion,
        calculatedNutrients: {
          calories: Math.round(food.calories * (portion / 100)),
          protein: Math.round(food.protein * (portion / 100) * 10) / 10,
          carbs: Math.round(food.carbs * (portion / 100) * 10) / 10,
          fats: Math.round(food.fats * (portion / 100) * 10) / 10,
          fiber: food.fiber ? Math.round(food.fiber * (portion / 100) * 10) / 10 : 0
        }
      }
    })
  }
}
