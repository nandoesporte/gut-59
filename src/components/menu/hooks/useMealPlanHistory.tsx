
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MealPlan } from '../types';
import { useAuth } from "@/hooks/useAuth";
import { toast } from 'sonner';

export interface MealPlanHistoryItem {
  id: string;
  created_at: string;
  plan_data: MealPlan;
  calories: number;
}

export const useMealPlanHistory = () => {
  const [plans, setPlans] = useState<MealPlanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPlans = async () => {
    if (!user) {
      console.log('User not authenticated, skipping meal plan history fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching meal plan history for user:', user.id);
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching meal plans:', error);
        toast.error('Erro ao carregar histórico de planos alimentares');
        setPlans([]);
      } else {
        console.log(`Found ${data?.length || 0} meal plans in history`);
        
        if (data && data.length > 0) {
          // Log the first plan to inspect its structure
          console.log('Sample meal plan:', JSON.stringify(data[0]));
        }
        
        // Process plans to ensure consistent data structure
        const processedPlans = (data || []).map(plan => {
          // Check if plan_data is a string and needs parsing
          let planData = plan.plan_data;
          if (typeof planData === 'string') {
            try {
              planData = JSON.parse(planData);
              console.log('Successfully parsed string plan_data to object');
            } catch (e) {
              console.error('Error parsing plan_data string:', e);
            }
          }
          
          return {
            ...plan,
            plan_data: planData
          };
        }).filter(plan => plan.plan_data); // Filter out plans without valid data
        
        setPlans(processedPlans);
      }
    } catch (error) {
      console.error('Exception when fetching meal plans:', error);
      toast.error('Erro ao carregar histórico de planos alimentares');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      console.log('Deleting meal plan:', planId);
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error('Error deleting meal plan:', error);
        toast.error('Erro ao excluir plano alimentar');
        return false;
      }

      console.log('Meal plan deleted successfully');
      toast.success('Plano alimentar excluído com sucesso');
      
      // Refresh the plans list
      await fetchPlans();
      return true;
    } catch (error) {
      console.error('Exception when deleting meal plan:', error);
      toast.error('Erro ao excluir plano alimentar');
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user]);

  return {
    plans,
    loading,
    fetchPlans,
    deletePlan
  };
};
