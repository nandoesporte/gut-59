
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const usePlanSelection = () => {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const planId = searchParams.get('planId');
    const viewMode = searchParams.get('view');
    
    if (planId && viewMode === 'details') {
      console.log('Opening rehab plan details for:', planId);
      setSelectedPlanId(planId);
    }
  }, [searchParams]);

  return { selectedPlanId };
};
