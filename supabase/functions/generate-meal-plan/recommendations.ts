
export function generateTimingRecommendations(trainingTime: string | null, goal: string) {
  const recommendations = {
    preworkout: "",
    postworkout: "",
    general: "Mantenha-se hidratado bebendo água ao longo do dia. Evite alimentos processados.",
    timing: [] as string[]
  };

  if (trainingTime) {
    const hour = parseInt(trainingTime.split(':')[0]);
    
    if (hour < 10) {
      recommendations.preworkout = "Café da manhã leve 30-45 minutos antes do treino, focando em carboidratos de rápida absorção e proteína de fácil digestão.";
      recommendations.postworkout = "Refeição pós-treino completa com proteínas e carboidratos para recuperação muscular. Ideal consumir dentro de 30 minutos após o treino.";
      recommendations.timing.push("Organize as refeições mais pesadas após o treino matinal");
      recommendations.timing.push("Café da manhã pré-treino deve ser mais leve e de fácil digestão");
    } else if (hour < 16) {
      recommendations.preworkout = "Lanche pré-treino 1 hora antes, combinando carboidratos e proteínas em proporções moderadas.";
      recommendations.postworkout = "Aproveite o almoço ou lanche da tarde como refeição pós-treino, priorizando proteínas magras e carboidratos complexos.";
      recommendations.timing.push("Mantenha o café da manhã nutritivo e substancial");
      recommendations.timing.push("Evite alimentos pesados 2 horas antes do treino");
    } else {
      recommendations.preworkout = "Lanche pré-treino 1-2 horas antes, evitando gorduras e priorizando carboidratos de fácil digestão.";
      recommendations.postworkout = "Jantar balanceado após o treino, com ênfase em proteínas para recuperação noturna.";
      recommendations.timing.push("Distribua bem as refeições ao longo do dia");
      recommendations.timing.push("Última refeição deve ser mais leve se for dormir logo após");
    }
  }

  switch (goal) {
    case 'lose':
      recommendations.timing.push("Concentre carboidratos nas refeições próximas ao treino");
      recommendations.timing.push("Mantenha refeições proteicas distribuídas ao longo do dia");
      recommendations.timing.push("Priorize fibras nas principais refeições para maior saciedade");
      break;
    case 'gain':
      recommendations.timing.push("Aumente o volume das refeições principais");
      recommendations.timing.push("Adicione shakes proteicos entre as refeições se necessário");
      recommendations.timing.push("Inclua carboidratos complexos em todas as refeições");
      break;
    default:
      recommendations.timing.push("Mantenha intervalo regular entre as refeições");
      recommendations.timing.push("Equilibre macronutrientes em todas as refeições");
      recommendations.timing.push("Varie as fontes de proteínas ao longo do dia");
  }

  return recommendations;
}
