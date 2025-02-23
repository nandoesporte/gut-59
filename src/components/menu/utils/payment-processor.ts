
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPlanDescription } from "./payment-messages";
import { updatePaymentStatus, grantPlanAccess } from "./payment-db";

type PlanType = 'nutrition' | 'workout' | 'rehabilitation';

const WEBHOOK_URL = "https://sxjafhzikftdenqnkcri.supabase.co/functions/v1/handle-mercadopago-webhook";

export const createPaymentPreference = async (
  planType: PlanType,
  amount: number
): Promise<{ preferenceId: string; initPoint: string }> => {
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    throw new Error('Erro ao obter dados do usuário');
  }

  const payload = {
    userId: userData.user.id,
    amount: amount,
    description: getPlanDescription(planType),
    notificationUrl: WEBHOOK_URL
  };

  console.log('Enviando payload para criação de preferência:', payload);

  const { data, error } = await supabase.functions.invoke(
    'create-mercadopago-preference',
    {
      body: payload
    }
  );

  if (error || !data?.preferenceId || !data?.initPoint) {
    console.error('Erro ao criar preferência:', error);
    throw new Error('Falha ao criar pagamento. Por favor, tente novamente.');
  }

  return {
    preferenceId: data.preferenceId,
    initPoint: data.initPoint
  };
};

export const checkPaymentStatus = async (
  preferenceId: string,
  userId: string,
  planType: PlanType,
  amount: number,
  onSuccess: () => void
) => {
  try {
    console.log('Verificando status do pagamento:', preferenceId);
    
    const { data: statusData, error: statusError } = await supabase.functions.invoke(
      'check-mercadopago-payment',
      {
        body: { preferenceId }
      }
    );

    console.log('Resposta do status do pagamento:', statusData);

    if (statusError) {
      console.error('Erro ao verificar status:', statusError);
      return false;
    }

    if (statusData?.isPaid) {
      console.log('Pagamento confirmado, atualizando status...');
      
      await updatePaymentStatus(userId, preferenceId, planType, amount);

      // After payment is confirmed, disable payment requirement and reset generation count
      const { error: accessError } = await supabase
        .from('plan_access')
        .upsert({
          user_id: userId,
          plan_type: planType,
          payment_required: false,
          is_active: true
        });

      if (accessError) {
        console.error('Erro ao atualizar acesso ao plano:', accessError);
        throw accessError;
      }

      // Reset generation count for this plan type
      const updateField = `${planType}_count`;
      const { error: countError } = await supabase
        .from('plan_generation_counts')
        .upsert({
          user_id: userId,
          [updateField]: 0
        });

      if (countError) {
        console.error('Erro ao resetar contagem de gerações:', countError);
        throw countError;
      }

      console.log('Status atualizado, chamando callback de sucesso...');
      onSuccess();
      
      toast.success("Pagamento confirmado! Você tem direito a 3 gerações do plano.", {
        duration: 5000,
        position: 'top-center'
      });
      
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    return false;
  }
};
