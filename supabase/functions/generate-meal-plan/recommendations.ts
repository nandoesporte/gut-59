import type { MealPlan } from './types.ts';

interface HealthRecommendations {
  [key: string]: {
    conditions: (plan: MealPlan) => boolean;
    message: string;
  };
}

const HEALTH_RECOMMENDATIONS: HealthRecommendations = {
  highProtein: {
    conditions: (plan) => {
      const totalCals = plan.totalNutrition.calories;
      const proteinCals = plan.totalNutrition.protein * 4;
      return (proteinCals / totalCals) > 0.35;
    },
    message: "Seu plano tem alto teor de proteína. Certifique-se de manter-se bem hidratado."
  },
  excessiveFat: {
    conditions: (plan) => {
      const totalCals = plan.totalNutrition.calories;
      const fatCals = plan.totalNutrition.fats * 9;
      return (fatCals / totalCals) > 0.35;
    },
    message: "Seu plano tem alto teor de gordura. Considere ajustar as fontes de gordura para opções mais saudáveis."
  },
  lowCarb: {
    conditions: (plan) => {
      const totalCals = plan.totalNutrition.calories;
      const carbCals = plan.totalNutrition.carbs * 4;
      return (carbCals / totalCals) < 0.3;
    },
    message: "Seu plano tem baixo teor de carboidratos. Avalie se isso está alinhado com suas necessidades energéticas e nível de atividade."
  },
  fiberIntake: {
    conditions: (plan) => plan.totalNutrition.fiber !== undefined && plan.totalNutrition.fiber < 25,
    message: "Aumente o consumo de fibras para melhorar a digestão e a saciedade. Inclua mais vegetais, frutas e grãos integrais."
  }
};

export function generateRecommendations({
  mealPlan,
  userGoal,
  trainingTime,
  analysis
}: {
  mealPlan: MealPlan;
  userGoal: string;
  trainingTime: string | null;
  analysis: string[];
}): string[] {
  const recommendations: string[] = [];

  // Verificar cada recomendação de saúde
  Object.entries(HEALTH_RECOMMENDATIONS).forEach(([key, rec]) => {
    if (rec.conditions(mealPlan)) {
      recommendations.push(rec.message);
    }
  });

  // Adicionar recomendações específicas do objetivo
  switch (userGoal) {
    case 'lose_weight':
      recommendations.push("Mantenha um déficit calórico controlado e foque em alimentos ricos em proteína para preservar a massa muscular.");
      break;
    case 'gain_muscle':
      recommendations.push("Priorize refeições ricas em proteína próximas ao treino para otimizar o ganho muscular.");
      break;
    case 'maintain':
      recommendations.push("Mantenha uma dieta equilibrada e ajuste as calorias conforme necessário para manter seu peso.");
      break;
  }

  // Adicionar recomendações baseadas no horário de treino
  if (trainingTime) {
    recommendations.push(`Para otimizar seu treino às ${trainingTime}, procure consumir carboidratos complexos 2-3 horas antes.`);
  }

  // Adicionar insights da análise
  if (analysis.length > 0) {
    recommendations.push("Sugestões de ajuste baseadas na análise do plano:");
    recommendations.push(...analysis.map(item => `- ${item}`));
  }

  return recommendations;
}
