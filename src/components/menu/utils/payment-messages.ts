
type PlanType = 'nutrition' | 'workout' | 'rehabilitation';

export const getPlanDescription = (planType: PlanType): string => {
  switch (planType) {
    case 'nutrition':
      return 'Plano Alimentar Personalizado';
    case 'workout':
      return 'Plano de Treino Personalizado';
    case 'rehabilitation':
      return 'Plano de Reabilitação Personalizado';
    default:
      return 'Plano Personalizado';
  }
};

export const getSuccessMessage = (planType: PlanType): string => {
  switch (planType) {
    case 'nutrition':
      return 'Seu plano alimentar personalizado está pronto para ser gerado!';
    case 'workout':
      return 'Seu plano de treino personalizado está pronto para ser gerado!';
    case 'rehabilitation':
      return 'Seu plano de reabilitação personalizado está pronto para ser gerado!';
    default:
      return 'Seu plano personalizado está pronto para ser gerado!';
  }
};
