
import { useState, useEffect } from 'react';
import { List } from 'lucide-react';
import { MealPlan } from './types';
import { useMealPlanHistory } from './hooks/useMealPlanHistory';
import { MealPlanList } from './components/MealPlanList';
import { DeleteConfirmationDialog } from './components/DeleteConfirmationDialog';
import { SavedMealPlanDetails } from './components/SavedMealPlanDetails';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const MealPlanHistory = () => {
  const { plans, loading, fetchPlans, deletePlan } = useMealPlanHistory();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewPlanId, setViewPlanId] = useState<string | null>(null);
  const [viewPlanData, setViewPlanData] = useState<MealPlan | null>(null);
  const { user } = useAuth();

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      console.log('Confirming deletion of plan:', deleteId);
      const success = await deletePlan(deleteId);
      if (success) {
        setDeleteId(null);
      }
    }
  };

  const handleViewDetails = (planId: string, planData: MealPlan) => {
    console.log('Viewing details for plan:', planId);
    console.log('Plan data structure:', Object.keys(planData));
    
    // Verify the data structure
    if (!planData.weeklyPlan) {
      console.error('Invalid plan data - missing weeklyPlan:', planData);
      toast.error('Erro ao carregar detalhes do plano. Estrutura de dados inválida.');
      return;
    }
    
    setViewPlanId(planId);
    setViewPlanData(planData);
  };

  const handleCloseDetails = () => {
    setViewPlanId(null);
    setViewPlanData(null);
    // Refresh plans after closing details in case changes were made
    fetchPlans();
  };

  // Add an effect to refresh plans when the component mounts or user changes
  useEffect(() => {
    console.log('MealPlanHistory component mounted or user changed');
    if (user) {
      console.log('User is authenticated, fetching plans...');
      fetchPlans();
    } else {
      console.log('No authenticated user');
    }
  }, [user]);

  // Add an additional effect to log whenever plans data changes
  useEffect(() => {
    console.log('Plans data updated, count:', plans.length);
    if (plans.length > 0) {
      console.log('First plan ID:', plans[0].id);
      console.log('First plan data structure:',
        Object.keys(plans[0].plan_data).join(', '),
        'weeklyPlan days:', plans[0].plan_data.weeklyPlan ? Object.keys(plans[0].plan_data.weeklyPlan).length : 0
      );
    }
  }, [plans]);

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
