
import React, { useState } from 'react';
import { FisioPreferences } from '@/components/fisio/types';
import { FisioPreferencesForm } from '@/components/fisio/PreferencesForm';
import { ExercisePlanDisplay } from '@/components/fisio/ExercisePlanDisplay';
import { FisioHistoryView } from '@/components/fisio/components/FisioHistory';
import { RehabPlan } from '../types/rehab-plan';
import { useIsMobile } from '@/hooks/use-mobile';

interface FisioContentProps {
  historyPlans: RehabPlan[];
  isLoadingHistory: boolean;
  fetchFisioHistory: () => void;
  selectedPlanId: string | null;
}

export const FisioContent: React.FC<FisioContentProps> = ({ 
  historyPlans, 
  isLoadingHistory, 
  fetchFisioHistory,
  selectedPlanId 
}) => {
  const [preferences, setPreferences] = useState<FisioPreferences | null>(null);
  const isMobile = useIsMobile();

  const handlePreferencesSubmit = (prefs: FisioPreferences) => {
    console.log('Preferências submetidas no componente Fisio:', prefs);
    setPreferences(prefs);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlanGenerated = () => {
    // Refresh history after a new plan is generated
    fetchFisioHistory();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {!preferences ? (
        <div className="transform transition-all duration-300 hover:scale-[1.01]">
          <FisioPreferencesForm onSubmit={handlePreferencesSubmit} />
        </div>
      ) : (
        <ExercisePlanDisplay 
          preferences={preferences} 
          onReset={() => {
            setPreferences(null);
            fetchFisioHistory();
          }}
          onPlanGenerated={handlePlanGenerated}
        />
      )}

      <div className="mt-4 sm:mt-6">
        <FisioHistoryView
          isLoading={isLoadingHistory}
          historyPlans={historyPlans}
          onRefresh={fetchFisioHistory}
          selectedPlanId={selectedPlanId}
        />
      </div>
    </div>
  );
};
