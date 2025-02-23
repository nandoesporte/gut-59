
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPlanDescription } from "./payment-messages";
import { updatePaymentStatus } from "./payment-db";

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
      
      // First, update payment status in the payments table
      await updatePaymentStatus(userId, preferenceId, planType, amount);

      // Then check generation count
      const { data: countData } = await supabase
        .from('plan_generation_counts')
        .select(`${planType}_count`)
        .eq('user_id', userId)
        .single();

      const currentCount = countData ? countData[`${planType}_count`] : 0;

      if (currentCount >= 3) {
        // Reactivate payment requirement if count is 3 or more
        const { error: grantError } = await supabase.functions.invoke('grant-plan-access', {
          body: {
            userId,
            planType,
            disablePayment: false, // Reactivate payment requirement
          }
        });

        if (grantError) {
          console.error('Erro ao reativar requisito de pagamento:', grantError);
          throw grantError;
        }

        toast.warning("Você atingiu o limite de gerações do plano. Um novo pagamento será necessário para continuar.", {
          duration: 6000,
          position: 'top-center'
        });
      } else {
        // Disable payment requirement
        const { error: grantError } = await supabase.functions.invoke('grant-plan-access', {
          body: {
            userId,
            planType,
            disablePayment: true
          }
        });

        if (grantError) {
          console.error('Erro ao liberar acesso ao plano:', grantError);
          throw grantError;
        }

        console.log('Acesso ao plano liberado com sucesso');
        onSuccess();
        
        toast.success("Pagamento confirmado! Você tem direito a 3 gerações do plano.", {
          duration: 5000,
          position: 'top-center'
        });
      }
      
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    return false;
  }
};
