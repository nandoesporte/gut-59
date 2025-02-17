
import { MealPlan, DietaryPreferences } from './types.ts'

export class NutritionalScorer {
  async score({
    mealPlan,
    dietaryPreferences
  }: {
    mealPlan: MealPlan;
    dietaryPreferences: DietaryPreferences;
  }) {
    const totalCalories = mealPlan.totalNutrition.calories;
    
    // Calcular distribuição de macronutrientes
    const macroDistribution = {
      protein: Math.round((mealPlan.totalNutrition.protein * 4 / totalCalories) * 100),
      carbs: Math.round((mealPlan.totalNutrition.carbs * 4 / totalCalories) * 100),
      fats: Math.round((mealPlan.totalNutrition.fats * 9 / totalCalories) * 100)
    };

    // Verificar adequação de fibras (25g/dia como referência)
    const fiberAdequate = mealPlan.totalNutrition.fiber >= 25;

    // Contar vitaminas e minerais únicos
    const vitaminsAndMinerals = new Set();
    Object.values(mealPlan.dailyPlan).forEach(meal => {
      meal.foods.forEach(food => {
        if (food.vitamins_minerals) {
          Object.keys(food.vitamins_minerals).forEach(nutrient => {
            vitaminsAndMinerals.add(nutrient);
          });
        }
      });
    });

    // Verificar completude de vitaminas e minerais
    const vitaminsComplete = vitaminsAndMinerals.size >= 8;
    const mineralsComplete = vitaminsAndMinerals.size >= 5;

    return {
      macroDistribution,
      fiberAdequate,
      vitaminsComplete,
      mineralsComplete,
      score: this.calculateOverallScore({
        macroDistribution,
        fiberAdequate,
        vitaminsComplete,
        mineralsComplete
      })
    };
  }

  private calculateOverallScore({
    macroDistribution,
    fiberAdequate,
    vitaminsComplete,
    mineralsComplete
  }: {
    macroDistribution: { protein: number; carbs: number; fats: number };
    fiberAdequate: boolean;
    vitaminsComplete: boolean;
    mineralsComplete: boolean;
  }) {
    let score = 0;

    // Pontuação para distribuição de macros (máx: 50 pontos)
    const idealMacros = { protein: 25, carbs: 50, fats: 25 };
    const macroDiff = Math.abs(macroDistribution.protein - idealMacros.protein) +
                      Math.abs(macroDistribution.carbs - idealMacros.carbs) +
                      Math.abs(macroDistribution.fats - idealMacros.fats);
    
    score += Math.max(0, 50 - macroDiff);

    // Pontuação para fibras (20 pontos)
    if (fiberAdequate) score += 20;

    // Pontuação para vitaminas (15 pontos)
    if (vitaminsComplete) score += 15;

    // Pontuação para minerais (15 pontos)
    if (mineralsComplete) score += 15;

    return score;
  }
}
