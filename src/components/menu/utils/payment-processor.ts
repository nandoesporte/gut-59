
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

  // Verificar configuração global de pagamento
  const { data: paymentSettings, error: settingsError } = await supabase
    .from('payment_settings')
    .select('is_active')
    .eq('plan_type', planType)
    .single();

  if (settingsError) {
    console.error('Erro ao verificar configuração de pagamento:', settingsError);
    throw new Error('Erro ao verificar configuração de pagamento');
  }

  // Se o pagamento não estiver ativo globalmente, não criar preferência
  if (!paymentSettings?.is_active) {
    throw new Error('Pagamento não é necessário para este plano');
  }

  // Verificar configuração específica do usuário
  const { data: planAccess, error: accessError } = await supabase
    .from('plan_access')
    .select('payment_required')
    .eq('user_id', userData.user.id)
    .eq('plan_type', planType)
    .maybeSingle();

  if (accessError) {
    console.error('Erro ao verificar acesso do usuário:', accessError);
    throw new Error('Erro ao verificar acesso do usuário');
  }

  // Se o usuário tiver acesso especial sem necessidade de pagamento
  if (planAccess && !planAccess.payment_required) {
    throw new Error('Pagamento não é necessário para este usuário');
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

  try {
    // Delete any existing pending payments for this user and plan type
    await supabase
      .from('payments')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('plan_type', planType)
      .eq('status', 'pending');

    // Create new payment record
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        user_id: userData.user.id,
        payment_id: data.preferenceId,
        plan_type: planType,
        amount: amount,
        status: 'pending'
      });

    if (insertError) {
      console.error('Erro ao inserir pagamento:', insertError);
      throw insertError;
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
  paymentId: string,
  userId: string,
  planType: PlanType,
  amount: number,
  onSuccess: () => void
) => {
  try {
    console.log('Verificando status do pagamento:', paymentId);
    
    // Check payment status in our database first
    const { data: paymentData } = await supabase
      .from('payments')
      .select('status')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (paymentData?.status === 'completed') {
      console.log('Pagamento já está marcado como completo no banco de dados');
      onSuccess();
      return true;
    }

    // If not completed in database, check with Mercado Pago
    const { data: statusData, error: statusError } = await supabase.functions.invoke(
      'check-mercadopago-payment',
      {
        body: { paymentId }
      }
    );

    console.log('Resposta do status do pagamento:', statusData);

    if (statusError) {
      console.error('Erro ao verificar status:', statusError);
      return false;
    }

    if (statusData?.isPaid) {
      console.log('Pagamento confirmado, atualizando status...');
      
      await updatePaymentStatus(userId, paymentId, planType, amount);

      // Check current plan generation count
      const { data: countData } = await supabase
        .from('plan_generation_counts')
        .select(`${planType}_count`)
        .eq('user_id', userId)
        .maybeSingle();

      const currentCount = countData ? countData[`${planType}_count`] : 0;

      // Grant plan access
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

