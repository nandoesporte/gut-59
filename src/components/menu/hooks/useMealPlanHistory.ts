
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MealPlan } from '../types';

interface StoredMealPlan {
  id: string;
  created_at: string;
  plan_data: MealPlan;
  calories: number;
}

interface RawMealPlan {
  id: string;
  created_at: string;
  plan_data: unknown;
  calories: number;
}

const validateMealPlan = (planData: unknown): planData is MealPlan => {
  const plan = planData as MealPlan;
  return !!(
    plan &&
    typeof plan === 'object' &&
    'weeklyPlan' in plan &&
    'weeklyTotals' in plan &&
    'recommendations' in plan
  );
};

export const useMealPlanHistory = () => {
  const [plans, setPlans] = useState<StoredMealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('Fetching meal plans for user:', user?.id);
      
      if (!user) {
        console.log('No authenticated user found');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching meal plans:', error);
        throw error;
      }

      console.log('Raw meal plans data from database:', data);
      
      if (!data || data.length === 0) {
        console.log('No meal plans found in database for this user');
        setPlans([]);
        setLoading(false);
        return;
      }

      const validPlans = (data as RawMealPlan[]).reduce<StoredMealPlan[]>((acc, plan) => {
        console.log('Processing plan:', plan.id, 'with data:', typeof plan.plan_data);
        
        if (!plan.plan_data) {
          console.error('Plan data is empty or null for plan:', plan.id);
          return acc;
        }
        
        try {
          // If plan_data is a string, try to parse it as JSON
          const planData = typeof plan.plan_data === 'string' 
            ? JSON.parse(plan.plan_data) 
            : plan.plan_data;
            
          if (validateMealPlan(planData)) {
            acc.push({
              id: plan.id,
              created_at: plan.created_at,
              plan_data: planData as MealPlan,
              calories: plan.calories,
            });
          } else {
            console.error('Invalid meal plan structure for plan:', plan.id);
            console.log('Plan data that failed validation:', planData);
          }
        } catch (e) {
          console.error('Error processing meal plan:', plan.id, e);
        }
        
        return acc;
      }, []);

      console.log('Valid plans after processing:', validPlans.length);
      setPlans(validPlans);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
      toast.error('Erro ao carregar histórico de planos');
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPlans(plans.filter(plan => plan.id !== id));
      toast.success('Plano excluído com sucesso');
      return true;
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      toast.error('Erro ao excluir plano');
      return false;
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    console.log('Plans state updated, count:', plans.length);
  }, [plans]);

  return {
    plans,
    loading,
    fetchPlans,
    deletePlan
  };
};
