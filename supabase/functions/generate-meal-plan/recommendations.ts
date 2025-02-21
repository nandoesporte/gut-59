import type { MealPlan } from './types.ts';

interface HealthRecommendations {
  [key: string]: {
    avoid: string[];
    prefer: string[];
    timing: string[];
    general: string;
  };
}

const healthConditionRecommendations: HealthRecommendations = {
  hipertensao: {
    avoid: ["alimentos ricos em sódio", "alimentos processados", "embutidos"],
    prefer: ["vegetais folhosos", "frutas", "grãos integrais", "proteínas magras"],
    timing: [
      "Distribua as refeições em 5-6 vezes ao dia",
      "Evite grandes refeições à noite"
    ],
    general: "Mantenha uma dieta baixa em sódio e rica em potássio, magnésio e cálcio. Priorize alimentos naturais e evite processados."
  },
  diabetes: {
    avoid: ["açúcares simples", "carboidratos refinados", "bebidas açucaradas"],
    prefer: ["proteínas magras", "gorduras boas", "fibras", "vegetais"],
    timing: [
      "Mantenha horários regulares para as refeições",
      "Não pule refeições para evitar picos de glicose"
    ],
    general: "Foque em alimentos com baixo índice glicêmico e ricos em fibras. Monitore a ingestão de carboidratos ao longo do dia."
  },
  depressao_ansiedade: {
    avoid: ["cafeína em excesso", "álcool", "açúcares refinados"],
    prefer: ["alimentos ricos em triptofano", "ômega-3", "vitaminas do complexo B"],
    timing: [
      "Mantenha refeições regulares",
      "Evite longos períodos sem se alimentar"
    ],
    general: "Priorize alimentos que contribuem para a produção de serotonina e outros neurotransmissores. Mantenha uma alimentação regular e equilibrada."
  }
};

export const generateTimingRecommendations = (
  trainingTime: string | null,
  goal: string,
  healthCondition: string | null = null
) => {
  let recommendations = {
    preworkout: "",
    postworkout: "",
    general: "",
    timing: [] as string[]
  };

  // Recomendações baseadas no objetivo
  switch (goal) {
    case "lose":
      recommendations.general = "Distribua as refeições em intervalos regulares para controlar o apetite e mantenha um déficit calórico moderado. Priorize alimentos ricos em proteínas e fibras para maior saciedade.";
      recommendations.timing.push(
        "Faça refeições a cada 3-4 horas",
        "Evite refeições pesadas próximo ao horário de dormir"
      );
      break;
    case "maintain":
      recommendations.general = "Mantenha uma distribuição equilibrada de macronutrientes e horários regulares de refeições para estabilizar o metabolismo.";
      recommendations.timing.push(
        "Distribua as calorias uniformemente ao longo do dia",
        "Mantenha horários regulares para as refeições"
      );
      break;
    case "gain":
      recommendations.general = "Aumente gradualmente a ingestão calórica com foco em proteínas de qualidade e carboidratos complexos. Distribua as calorias em várias refeições ao longo do dia.";
      recommendations.timing.push(
        "Faça refeições a cada 2-3 horas",
        "Inclua um lanche proteico antes de dormir"
      );
      break;
  }

  // Adiciona recomendações específicas para condição de saúde
  if (healthCondition && healthConditionRecommendations[healthCondition]) {
    const healthRecs = healthConditionRecommendations[healthCondition];
    recommendations.general += `\n\nConsiderando sua condição de saúde: ${healthRecs.general}`;
    recommendations.timing = [...recommendations.timing, ...healthRecs.timing];
  }

  // Recomendações pré e pós-treino baseadas no horário de treino
  if (trainingTime) {
    const trainingHour = new Date(`1970-01-01T${trainingTime}`).getHours();
    
    recommendations.preworkout = `Para seu treino às ${trainingTime}, consuma uma refeição leve 1-2 horas antes, ` +
      "priorizando carboidratos de fácil digestão e proteínas magras. " +
      "Evite alimentos muito gordurosos ou ricos em fibras próximo ao treino.";
    
    recommendations.postworkout = "Após o treino, consuma uma refeição com proteínas de alta qualidade e " +
      "carboidratos para recuperação muscular e reposição de glicogênio. " +
      "Hidrate-se bem durante todo o processo.";
    
    // Ajusta o timing das refeições com base no horário do treino
    recommendations.timing.push(
      `Faça uma refeição leve 1-2 horas antes do treino (${trainingTime})`,
      `Consuma proteínas e carboidratos em até 1 hora após o treino`
    );
  }

  return recommendations;
};
