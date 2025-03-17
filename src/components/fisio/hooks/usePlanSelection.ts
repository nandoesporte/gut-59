
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const usePlanSelection = () => {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const planId = searchParams.get('planId');
    const viewMode = searchParams.get('view');
    
    if (planId && viewMode === 'details') {
      console.log('Abrindo detalhes do plano de reabilitação para:', planId);
      setSelectedPlanId(planId);
    } else {
      // Limpa o plano selecionado se não estiver na URL
      setSelectedPlanId(null);
    }
  }, [searchParams]);

  // Função para navegar para a página de detalhes de um plano
  const viewPlanDetails = (planId: string) => {
    navigate(`/fisio?planId=${planId}&view=details`);
  };

  return { selectedPlanId, viewPlanDetails };
};
