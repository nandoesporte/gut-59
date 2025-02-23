
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

  // Registra o pagamento no banco de dados
  try {
    // Primeiro verifica se já existe um pagamento pendente
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('payment_id, status')
      .eq('user_id', userData.user.id)
      .eq('plan_type', planType)
      .eq('status', 'pending')
      .single();

    // Se existir, atualiza com o novo preference_id
    if (existingPayment) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_id: data.preferenceId,
          amount: amount,
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', existingPayment.payment_id);

      if (updateError) throw updateError;
    } else {
      // Se não existir, cria um novo
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          user_id: userData.user.id,
          payment_id: data.preferenceId,
          plan_type: planType,
          amount: amount,
          status: 'pending'
        });

      if (insertError) throw insertError;
    }

  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    throw new Error('Erro ao registrar pagamento. Por favor, tente novamente.');
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
    
    // Primeiro verifica no nosso banco de dados
    const { data: paymentData } = await supabase
      .from('payments')
      .select('status')
      .eq('payment_id', preferenceId)
      .single();

    if (paymentData?.status === 'completed') {
      console.log('Pagamento já está marcado como completo no banco de dados');
      onSuccess();
      return true;
    }

    // Se não estiver completo no banco, verifica com o Mercado Pago
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

      const { data: countData } = await supabase
        .from('plan_generation_counts')
        .select(`${planType}_count`)
        .eq('user_id', userId)
        .single();

      const currentCount = countData ? countData[`${planType}_count`] : 0;

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
      
      if (currentCount >= 3) {
        toast.warning("Você atingiu o limite de gerações do plano. Um novo pagamento será necessário.", {
          duration: 6000,
        });
      } else {
        toast.success("Pagamento confirmado! Você tem direito a 3 gerações do plano.", {
          duration: 5000,
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
