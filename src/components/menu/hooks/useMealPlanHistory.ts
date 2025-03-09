
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
  
  const plan = planData as any;
  const hasRequiredProps = !!(
    plan &&
    'weeklyPlan' in plan &&
    'weeklyTotals' in plan
  );
  
  if (!hasRequiredProps) {
    console.error('Invalid meal plan structure. Missing required properties:', 
      'weeklyPlan:', 'weeklyPlan' in plan,
      'weeklyTotals:', 'weeklyTotals' in plan
    );
    console.log('Plan data preview:', JSON.stringify(plan).substring(0, 200) + '...');
  }
  
  return hasRequiredProps;
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
        
        if (!plan.plan_data) {
          console.error('- Plan data is empty or null');
          return acc;
        }
        
        try {
          // Parse plan_data if it's a string
          let parsedPlanData: any = plan.plan_data;
          if (typeof plan.plan_data === 'string') {
            console.log('- Plan data is a string, attempting to parse JSON');
            try {
              parsedPlanData = JSON.parse(plan.plan_data);
              console.log('- Successfully parsed JSON string');
            } catch (parseError) {
              console.error('- Failed to parse plan_data string:', parseError);
              // Try to see if it's already a valid JSON but just as a string
              if (typeof plan.plan_data === 'string' && plan.plan_data.includes('"weeklyPlan"')) {
                console.log('- Plan data appears to be a JSON string with weeklyPlan, trying to extract mealPlan object');
                // If the actual plan is in a mealPlan property
                try {
                  const jsonObj = JSON.parse(plan.plan_data);
                  if (jsonObj.mealPlan && typeof jsonObj.mealPlan === 'object') {
                    parsedPlanData = jsonObj.mealPlan;
                    console.log('- Successfully extracted mealPlan from JSON string');
                  }
                } catch (nestedParseError) {
                  console.error('- Failed to extract mealPlan object:', nestedParseError);
                  return acc;
                }
              } else {
                return acc;
              }
            }
          } else if (typeof plan.plan_data === 'object' && plan.plan_data !== null) {
            // If plan_data is already an object, check if it has a mealPlan property
            const planDataObj = plan.plan_data as any;
            if (planDataObj.mealPlan && typeof planDataObj.mealPlan === 'object') {
              console.log('- Plan data is an object with mealPlan property, using that directly');
              parsedPlanData = planDataObj.mealPlan;
            }
          }
          
          // Log the structure of the parsed data
          console.log('- Parsed plan data structure:', 
            Object.keys(parsedPlanData).join(', '),
            'weeklyPlan present:', 'weeklyPlan' in parsedPlanData,
            'weeklyTotals present:', 'weeklyTotals' in parsedPlanData
          );
          
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
      if (validPlans.length > 0) {
        console.log('First valid plan ID:', validPlans[0].id);
        console.log('First valid plan creation date:', validPlans[0].created_at);
        console.log('First valid plan calories:', validPlans[0].calories);
        console.log('First valid plan structure:', 
          Object.keys(validPlans[0].plan_data).join(', '),
          'weeklyPlan days:', validPlans[0].plan_data.weeklyPlan ? Object.keys(validPlans[0].plan_data.weeklyPlan).length : 0
        );
      }
      
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

  // Initial fetch when component mounts
  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    plans,
    loading,
    fetchPlans,
    deletePlan
  };
};
