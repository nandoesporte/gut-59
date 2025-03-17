
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
  deletePlan: (planId: string) => Promise<boolean>;
  isDeletingPlan: boolean;
}

export const FisioContent: React.FC<FisioContentProps> = ({ 
  historyPlans, 
  isLoadingHistory, 
  fetchFisioHistory,
  selectedPlanId,
  deletePlan,
  isDeletingPlan
}) => {
  const [preferences, setPreferences] = useState<FisioPreferences | null>(null);
  const isMobile = useIsMobile();
  
  // Buscar o plano selecionado se houver
  const selectedPlan = selectedPlanId 
    ? historyPlans.find(plan => plan.id === selectedPlanId)
    : null;

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
      {selectedPlan ? (
        <ExercisePlanDisplay 
          preferences={null}
          onReset={() => {
            window.history.pushState({}, '', '/fisio');
            fetchFisioHistory();
          }}
          onPlanGenerated={handlePlanGenerated}
          existingPlan={selectedPlan}
        />
      ) : !preferences ? (
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
          onDelete={deletePlan}
          isDeletingPlan={isDeletingPlan}
        />
      </div>
    </div>
  );
};
