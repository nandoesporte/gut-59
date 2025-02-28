
import { Meal, Food, DailyPlan, NutrientAnalysis } from './types';
import { calculatePortionSize } from './portion-calculator.ts';
import { scoreNutritionalProfile } from './nutritional-scorer.ts';

export function analyzeMealPlan(dailyPlan: DailyPlan): NutrientAnalysis {
  // Calculate total and average nutrients
  const totalCalories = Object.values(dailyPlan.meals).reduce(
    (sum, meal) => sum + meal.totalNutrients.calories, 0
  );
  
  const totalProtein = Object.values(dailyPlan.meals).reduce(
    (sum, meal) => sum + meal.totalNutrients.protein, 0
  );
  
  const totalCarbs = Object.values(dailyPlan.meals).reduce(
    (sum, meal) => sum + meal.totalNutrients.carbs, 0
  );
  
  const totalFats = Object.values(dailyPlan.meals).reduce(
    (sum, meal) => sum + meal.totalNutrients.fats, 0
  );
  
  const totalFiber = Object.values(dailyPlan.meals).reduce(
    (sum, meal) => sum + meal.totalNutrients.fiber, 0
  );

  // Calculate macronutrient ratios
  const totalCaloriesFromMacros = 
    (totalProtein * 4) + (totalCarbs * 4) + (totalFats * 9);
  
  const proteinPercentage = Math.round((totalProtein * 4 / totalCaloriesFromMacros) * 100);
  const carbsPercentage = Math.round((totalCarbs * 4 / totalCaloriesFromMacros) * 100);
  const fatsPercentage = Math.round((totalFats * 9 / totalCaloriesFromMacros) * 100);

  // Score the nutritional profile
  const nutritionalScore = scoreNutritionalProfile({
    calories: totalCalories,
    protein: totalProtein,
    carbs: totalCarbs,
    fats: totalFats,
    fiber: totalFiber
  });

  // Analyze meal balance and timing
  const mealCalorieDistribution = Object.entries(dailyPlan.meals).map(([mealType, meal]) => ({
    mealType,
    percentage: Math.round((meal.totalNutrients.calories / totalCalories) * 100)
  }));

  return {
    totalNutrients: {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
      fiber: totalFiber
    },
    macroRatios: {
      protein: proteinPercentage,
      carbs: carbsPercentage,
      fats: fatsPercentage
    },
    mealDistribution: mealCalorieDistribution,
    nutritionalScore,
    recommendations: generateRecommendations({
      macroRatios: {
        protein: proteinPercentage,
        carbs: carbsPercentage,
        fats: fatsPercentage
      },
      totalNutrients: {
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fats: totalFats,
        fiber: totalFiber
      },
      mealDistribution: mealCalorieDistribution
    })
  };
}

function generateRecommendations(analysis: {
  macroRatios: { protein: number; carbs: number; fats: number };
  totalNutrients: { calories: number; protein: number; carbs: number; fats: number; fiber: number };
  mealDistribution: { mealType: string; percentage: number }[];
}): string[] {
  const recommendations: string[] = [];

  // Check protein intake
  if (analysis.macroRatios.protein < 15) {
    recommendations.push(
      "Aumentar a ingestão de proteínas incluindo mais fontes como frango, peixe, ovos, tofu ou leguminosas."
    );
  } else if (analysis.macroRatios.protein > 35) {
    recommendations.push(
      "Diminuir ligeiramente a ingestão de proteínas e aumentar a proporção de carboidratos complexos e gorduras saudáveis."
    );
  }

  // Check carbohydrate intake
  if (analysis.macroRatios.carbs < 40) {
    recommendations.push(
      "Considerar aumentar o consumo de carboidratos complexos como grãos integrais, frutas e legumes."
    );
  } else if (analysis.macroRatios.carbs > 65) {
    recommendations.push(
      "Reduzir a proporção de carboidratos e aumentar a ingestão de proteínas e gorduras saudáveis para maior saciedade."
    );
  }

  // Check fat intake
  if (analysis.macroRatios.fats < 20) {
    recommendations.push(
      "Aumentar o consumo de gorduras saudáveis como azeite, abacate, oleaginosas e peixes gordurosos."
    );
  } else if (analysis.macroRatios.fats > 35) {
    recommendations.push(
      "Reduzir ligeiramente a ingestão de gorduras, especialmente as gorduras saturadas."
    );
  }

  // Check fiber intake
  if (analysis.totalNutrients.fiber < 25) {
    recommendations.push(
      "Aumentar o consumo de fibras incluindo mais legumes, frutas, grãos integrais e leguminosas."
    );
  }

  // Check meal distribution
  const breakfast = analysis.mealDistribution.find(meal => meal.mealType === "breakfast");
  if (breakfast && breakfast.percentage < 15) {
    recommendations.push(
      "Tornar o café da manhã mais substancial para melhor distribuição calórica ao longo do dia."
    );
  }
  
  // If you have a dinner entry, you can also check if dinner is too heavy
  const dinner = analysis.mealDistribution.find(meal => meal.mealType === "dinner");
  if (dinner && dinner.percentage > 35) {
    recommendations.push(
      "Distribuir mais calorias nas refeições anteriores e reduzir o tamanho do jantar."
    );
  }

  // General recommendations for healthier eating patterns
  if (recommendations.length === 0) {
    recommendations.push(
      "Manter o padrão alimentar atual que apresenta boa distribuição de macronutrientes."
    );
  }

  recommendations.push(
    "Manter-se bem hidratado bebendo pelo menos 2 litros de água por dia."
  );

  return recommendations;
}
