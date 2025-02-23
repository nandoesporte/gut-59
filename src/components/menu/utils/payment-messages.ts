
type PlanType = 'nutrition' | 'workout' | 'rehabilitation';

export const getSuccessMessage = (planType: PlanType) => {
  const messages = {
    nutrition: "Seu plano nutricional está pronto para ser gerado!",
    workout: "Seu plano de treino está pronto para ser gerado!",
    rehabilitation: "Seu plano de reabilitação está pronto para ser gerado!"
  };
  return messages[planType];
};

export const getPlanDescription = (planType: PlanType) => {
  const descriptions = {
    nutrition: "Plano Alimentar Personalizado",
    workout: "Plano de Treino Personalizado",
    rehabilitation: "Plano de Reabilitação Personalizado"
  };
  return descriptions[planType];
};
