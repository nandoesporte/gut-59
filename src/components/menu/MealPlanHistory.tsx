
import { useState } from 'react';
import { List } from 'lucide-react';
import { MealPlan } from './types';
import { useMealPlanHistory } from './hooks/useMealPlanHistory';
import { MealPlanList } from './components/MealPlanList';
import { DeleteConfirmationDialog } from './components/DeleteConfirmationDialog';
import { SavedMealPlanDetails } from './components/SavedMealPlanDetails';

export const MealPlanHistory = () => {
  const { plans, loading, fetchPlans, deletePlan } = useMealPlanHistory();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewPlanId, setViewPlanId] = useState<string | null>(null);
  const [viewPlanData, setViewPlanData] = useState<MealPlan | null>(null);

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deletePlan(deleteId);
      setDeleteId(null);
    }
  };

  const handleViewDetails = (planId: string, planData: MealPlan) => {
    setViewPlanId(planId);
    setViewPlanData(planData);
  };

  const handleCloseDetails = () => {
    setViewPlanId(null);
    setViewPlanData(null);
    fetchPlans(); // Refresh plans after closing details in case changes were made
  };

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <List className="w-6 h-6" />
        Histórico de Planos Alimentares
      </h2>
      
      <MealPlanList
        plans={plans}
        loading={loading}
        onViewDetails={handleViewDetails}
        onDeletePlan={setDeleteId}
      />

      <DeleteConfirmationDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />

      {viewPlanData && (
        <SavedMealPlanDetails
          planId={viewPlanId || ""}
          planData={viewPlanData}
          isOpen={!!viewPlanId}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
};
