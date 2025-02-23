
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PlanType = 'nutrition' | 'workout' | 'rehabilitation';

export const fetchCurrentPrice = async (planType: PlanType): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('payment_settings')
      .select('price')
      .eq('plan_type', planType)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    if (data) {
      return data.price;
    }
    return 19.90; // Default price
  } catch (error) {
    console.error('Error fetching price:', error);
    return 19.90; // Default price on error
  }
};

export const updatePaymentStatus = async (userId: string, mercadopagoId: string, planType: PlanType, amount: number) => {
  try {
    const { error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        payment_id: mercadopagoId,
        plan_type: planType,
        amount: amount,
        status: 'completed'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error updating payment status:', error);
  }
};

export const grantPlanAccess = async (userId: string, planType: PlanType) => {
  try {
    const { error: accessError } = await supabase.functions.invoke('grant-plan-access', {
      body: {
        userId: userId,
        planType: planType
      }
    });

    if (accessError) throw accessError;
  } catch (error) {
    console.error('Erro ao registrar acesso ao plano:', error);
    toast.error("Erro ao liberar acesso ao plano. Por favor, contate o suporte.");
  }
};
