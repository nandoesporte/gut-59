
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
  if (!planData || typeof planData !== 'object') {
    console.error('Invalid meal plan: not an object or null', planData);
    return false;
  }
  
  const plan = planData as MealPlan;
  const isValid = !!(
    plan &&
    'weeklyPlan' in plan &&
    'weeklyTotals' in plan &&
    'recommendations' in plan
  );
  
  if (!isValid) {
    console.error('Invalid meal plan structure. Missing required properties:', 
      'weeklyPlan:', 'weeklyPlan' in plan,
      'weeklyTotals:', 'weeklyTotals' in plan,
      'recommendations:', 'recommendations' in plan
    );
    console.log('Plan data:', JSON.stringify(plan).substring(0, 200) + '...');
  }
  
  return isValid;
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
      console.log('Number of plans found:', data?.length || 0);
      
      if (!data || data.length === 0) {
        console.log('No meal plans found in database for this user');
        setPlans([]);
        setLoading(false);
        return;
      }

      // Process each meal plan and log detailed information for debugging
      const validPlans = (data as RawMealPlan[]).reduce<StoredMealPlan[]>((acc, plan) => {
        console.log(`Processing plan ${plan.id}:`);
        console.log('- Plan data type:', typeof plan.plan_data);
        
        if (!plan.plan_data) {
          console.error('- Plan data is empty or null');
          return acc;
        }
        
        try {
          // Parse plan_data if it's a string
          let parsedPlanData = plan.plan_data;
          if (typeof plan.plan_data === 'string') {
            console.log('- Plan data is a string, attempting to parse JSON');
            try {
              parsedPlanData = JSON.parse(plan.plan_data);
              console.log('- Successfully parsed JSON string');
            } catch (parseError) {
              console.error('- Failed to parse plan_data string:', parseError);
              return acc;
            }
          }
          
          // Validate the meal plan structure
          if (validateMealPlan(parsedPlanData)) {
            console.log('- Plan validation successful');
            acc.push({
              id: plan.id,
              created_at: plan.created_at,
              plan_data: parsedPlanData as MealPlan,
              calories: plan.calories,
            });
          } else {
            console.error('- Plan validation failed');
          }
        } catch (e) {
          console.error(`- Error processing meal plan ${plan.id}:`, e);
        }
        
        return acc;
      }, []);

      console.log('Valid plans after processing:', validPlans.length);
      console.log('First valid plan:', validPlans[0] ? JSON.stringify(validPlans[0].id) : 'none');
      
      setPlans(validPlans);
    } catch (error) {
      console.error('Error in fetchPlans:', error);
      toast.error('Erro ao carregar histórico de planos');
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (id: string): Promise<boolean> => {
    try {
      console.log('Deleting plan with ID:', id);
      
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting meal plan:', error);
        throw error;
      }

      console.log('Plan deleted successfully');
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
