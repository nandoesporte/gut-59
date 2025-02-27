
interface TrainingRecommendations {
  preworkout: string;
  postworkout: string;
  timing: string[];
}

interface Recommendations {
  general: string;
  preworkout?: string;
  postworkout?: string;
  timing: string[];
}

/**
 * Gera recomendações nutricionais personalizadas com base no objetivo e horário de treino
 */
export const generateRecommendations = (
  dailyCalories: number,
  goal: string,
  trainingTime: string | null
): Recommendations => {
  const generalRecommendations = getGeneralRecommendations(dailyCalories, goal);
  const timingRecommendations = getGeneralTimingRecommendations(goal);
  
  let recommendations: Recommendations = {
    general: generalRecommendations,
    timing: timingRecommendations
  };
  
  // Adicionar recomendações de treino se o horário for fornecido
  if (trainingTime) {
    const trainingRecs = getTrainingRecommendations(trainingTime, goal);
    recommendations.preworkout = trainingRecs.preworkout;
    recommendations.postworkout = trainingRecs.postworkout;
    
    // Adicionar recomendações específicas de timing para treino
    recommendations.timing = [
      ...recommendations.timing,
      ...trainingRecs.timing
    ];
  }
  
  return recommendations;
};

/**
 * Retorna recomendações gerais com base nas calorias diárias e objetivo
 */
const getGeneralRecommendations = (dailyCalories: number, goal: string): string => {
  const waterAmount = Math.round(dailyCalories / 1000 * 35); // 35ml por 1000kcal
  
  switch (goal) {
    case 'lose_weight':
      return `Para seu objetivo de emagrecimento, mantenha um déficit calórico moderado e priorize alimentos nutritivos. Inclua pelo menos ${waterAmount}ml de água por dia e evite pular refeições, pois isso pode levar a compulsões alimentares e dificultar a perda de peso saudável.`;
      
    case 'gain_weight':
      return `Para seu objetivo de ganho de massa, mantenha um superávit calórico moderado distribuído ao longo do dia. Priorize proteínas de alta qualidade e carboidratos complexos. Consuma pelo menos ${waterAmount}ml de água diariamente e planeje refeições estratégicas próximas ao treino.`;
      
    case 'maintain':
    default:
      return `Para manutenção do seu peso atual, distribua suas calorias de forma equilibrada ao longo do dia. Consuma pelo menos ${waterAmount}ml de água diariamente e varie os alimentos para garantir uma ingestão adequada de todos os nutrientes.`;
  }
};

/**
 * Retorna recomendações gerais de timing baseadas no objetivo
 */
const getGeneralTimingRecommendations = (goal: string): string[] => {
  const commonRecommendations = [
    "Evite ficar mais de 4 horas sem se alimentar durante o dia",
    "Inclua proteínas em todas as refeições para melhor saciedade e recuperação muscular"
  ];
  
  switch (goal) {
    case 'lose_weight':
      return [
        ...commonRecommendations,
        "Faça refeições menores a cada 3-4 horas para controlar a fome",
        "Evite carboidratos simples à noite",
        "Inclua fibras e proteínas em todas as refeições para aumentar a saciedade"
      ];
      
    case 'gain_weight':
      return [
        ...commonRecommendations,
        "Faça refeições maiores e mais frequentes a cada 2-3 horas",
        "Inclua um shake proteico ou refeição leve antes de dormir",
        "Priorize carboidratos de absorção rápida pós-treino"
      ];
      
    case 'maintain':
    default:
      return [
        ...commonRecommendations,
        "Distribua as calorias de forma equilibrada ao longo do dia",
        "Mantenha horários regulares para as refeições para estabilizar o metabolismo"
      ];
  }
};

/**
 * Gera recomendações específicas para pré e pós-treino com base no horário do treino
 */
const getTrainingRecommendations = (trainingTime: string, goal: string): TrainingRecommendations => {
  // Converter string de hora para objeto Date
  const trainingHour = new Date(`1970-01-01T${trainingTime}`).getHours();
  const isMorningTraining = trainingHour < 12;
  const isAfternoonTraining = trainingHour >= 12 && trainingHour < 18;
  const isEveningTraining = trainingHour >= 18;
  
  let preworkout = `Para seu treino às ${trainingTime}, consuma uma refeição completa 2-3 horas antes ou um lanche leve 30-60 minutos antes, priorizando carboidratos de fácil digestão e proteínas magras.`;
  let postworkout = "Após o treino, consuma proteínas de rápida absorção junto com carboidratos para otimizar a recuperação muscular e a reposição de glicogênio. Hidrate-se adequadamente.";
  
  const timingRecs: string[] = [];
  
  // Personalizar recomendações com base no horário do treino
  if (isMorningTraining) {
    if (goal === 'lose_weight') {
      preworkout = `Para seu treino matinal às ${trainingTime}, considere treinar em jejum ou consumir um lanche leve 30 minutos antes, como uma fonte de proteína e pouco carboidrato.`;
      postworkout = "Após o treino matinal, priorize uma refeição completa com proteínas magras e carboidratos complexos para iniciar bem o dia e otimizar a recuperação.";
      timingRecs.push("Distribua a maior parte das calorias nas refeições até o meio da tarde");
    } else {
      preworkout = `Para seu treino matinal às ${trainingTime}, consuma um lanche leve rico em carboidratos e proteínas 30-45 minutos antes, como frutas e whey protein.`;
      timingRecs.push("Prepare o lanche pré-treino na noite anterior para facilitar sua rotina matinal");
    }
  } else if (isAfternoonTraining) {
    preworkout = `Para seu treino às ${trainingTime}, tenha uma refeição balanceada 2-3 horas antes ou um lanche leve 1 hora antes, com carboidratos complexos e proteínas.`;
    timingRecs.push("Almoce pelo menos 2 horas antes do treino para permitir adequada digestão");
  } else if (isEveningTraining) {
    if (goal === 'lose_weight') {
      postworkout = "Após seu treino noturno, consuma uma refeição moderada em carboidratos e rica em proteínas para recuperação sem excesso calórico noturno.";
    } else {
      postworkout = "Após seu treino noturno, inclua uma refeição completa com proteínas de absorção lenta para favorecer a recuperação durante o sono.";
    }
    timingRecs.push("Evite cafeína após as 16h para não prejudicar o sono");
  }
  
  // Adicionar recomendações baseadas no objetivo
  if (goal === 'lose_weight') {
    timingRecs.push("Priorize proteínas e vegetais nas refeições após o treino");
  } else if (goal === 'gain_weight') {
    timingRecs.push("Aproveite a janela anabólica consumindo proteínas e carboidratos em até 45 minutos após o treino");
  }
  
  return {
    preworkout,
    postworkout,
    timing: timingRecs
  };
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
    case "lose_weight":
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
    case "gain_weight":
      recommendations.general = "Aumente gradualmente a ingestão calórica com foco em proteínas de qualidade e carboidratos complexos. Distribua as calorias em várias refeições ao longo do dia.";
      recommendations.timing.push(
        "Faça refeições a cada 2-3 horas",
        "Inclua um lanche proteico antes de dormir"
      );
      break;
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
