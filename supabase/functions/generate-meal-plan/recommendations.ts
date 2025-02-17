
import { MealPlan, MealPlanAnalysis, DietaryPreferences } from './types.ts'

export async function generateRecommendations({
  mealPlan,
  analysis,
  nutritionalScore,
  dietaryPreferences,
  healthCondition
}: {
  mealPlan: MealPlan;
  analysis: MealPlanAnalysis;
  nutritionalScore: any;
  dietaryPreferences: DietaryPreferences;
  healthCondition: string | null;
}): Promise<MealPlan['recommendations']> {
  const recommendations: MealPlan['recommendations'] = {
    preworkout: generatePreWorkoutRecommendation(dietaryPreferences.trainingTime),
    postworkout: generatePostWorkoutRecommendation(dietaryPreferences.trainingTime),
    general: generateGeneralRecommendations(analysis, nutritionalScore),
    timing: generateTimingRecommendations(dietaryPreferences.trainingTime),
    healthCondition: healthCondition
  };

  return recommendations;
}

function generatePreWorkoutRecommendation(trainingTime: string | null): string {
  if (!trainingTime) return "Mantenha-se hidratado e consuma carboidratos complexos 2-3 horas antes do treino.";

  return "Consuma uma refeição rica em carboidratos e moderada em proteínas 2-3 horas antes do treino. Evite gorduras próximo ao horário de treino.";
}

function generatePostWorkoutRecommendation(trainingTime: string | null): string {
  if (!trainingTime) return "Após o treino, priorize proteínas e carboidratos para recuperação muscular.";

  return "Consuma proteínas e carboidratos em até 30 minutos após o treino para otimizar a recuperação muscular.";
}

function generateGeneralRecommendations(
  analysis: MealPlanAnalysis,
  nutritionalScore: any
): string {
  const recommendations = [];

  if (nutritionalScore.macroDistribution.protein < 20) {
    recommendations.push("Aumente o consumo de proteínas");
  }

  if (!nutritionalScore.fiberAdequate) {
    recommendations.push("Adicione mais fibras à sua dieta");
  }

  if (!nutritionalScore.vitaminsComplete) {
    recommendations.push("Diversifique mais suas fontes de vitaminas");
  }

  return recommendations.join(". ") || "Mantenha uma alimentação variada e equilibrada.";
}

function generateTimingRecommendations(trainingTime: string | null): string[] {
  if (!trainingTime) {
    return [
      "Faça 5-6 refeições por dia",
      "Mantenha intervalo de 2-3 horas entre as refeições",
      "Evite refeições pesadas à noite"
    ];
  }

  const training = new Date(`2000-01-01T${trainingTime}`);
  const recommendations = [
    `Faça sua principal refeição 2-3 horas antes do treino (${training.getHours()}:${training.getMinutes()})`,
    "Consuma um shake ou refeição leve após o treino",
    "Distribua as demais refeições ao longo do dia"
  ];

  return recommendations;
}
