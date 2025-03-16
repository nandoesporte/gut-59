
import * as React from 'react';
import { useAuthCheck } from '@/components/fisio/hooks/useAuthCheck';
import { useFisioHistory } from '@/components/fisio/hooks/useFisioHistory';
import { usePlanSelection } from '@/components/fisio/hooks/usePlanSelection';
import { AuthenticationCheck } from '@/components/fisio/components/AuthenticationCheck';
import { FisioHeader } from '@/components/fisio/components/FisioHeader';
import { FisioContent } from '@/components/fisio/components/FisioContent';

const Fisio = () => {
  // Authentication hook
  const { isAuthenticated } = useAuthCheck();
  
  // Plan selection from URL params
  const { selectedPlanId } = usePlanSelection();
  
  // Fetch rehab plan history
  const { historyPlans, isLoadingHistory, fetchFisioHistory } = useFisioHistory(isAuthenticated);

  // Authentication check component (returns null if authenticated)
  const authCheck = (
    <AuthenticationCheck 
      isAuthenticated={isAuthenticated} 
      isCheckingAuth={isAuthenticated === null} 
    />
  );

  // If not authenticated, show auth check component only
  if (isAuthenticated === null || isAuthenticated === false) {
    return authCheck;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6 pb-20 sm:pb-24">
        <FisioHeader />
        <FisioContent 
          historyPlans={historyPlans}
          isLoadingHistory={isLoadingHistory}
          fetchFisioHistory={fetchFisioHistory}
          selectedPlanId={selectedPlanId}
        />
      </div>
    </div>
  );
};

export default Fisio;
