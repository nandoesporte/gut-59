
import { supabase } from "@/integrations/supabase/client";

export interface PaymentResponse {
  id: string;
  status: string;
  invoiceUrl: string;
}

export const createPayment = async (): Promise<PaymentResponse> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('Creating payment for user:', userData.user.id);

    const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
      body: {
        userId: userData.user.id,
        amount: 19.90,
        description: "Plano Alimentar Personalizado"
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (!data || !data.id || !data.invoiceUrl) {
      console.error('Invalid response from edge function:', data);
      throw new Error('Resposta inválida do serviço de pagamento');
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    throw error;
  }
};

export const checkPaymentStatus = async (paymentId: string): Promise<boolean> => {
  try {
    console.log('Checking payment status:', paymentId);

    const { data, error } = await supabase.functions.invoke('check-asaas-payment', {
      body: { paymentId }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (!data || !data.status) {
      console.error('Invalid response from edge function:', data);
      throw new Error('Resposta inválida do serviço de pagamento');
    }

    return data.status === 'CONFIRMED' || data.status === 'RECEIVED' || data.status === 'APPROVED';
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    throw error;
  }
};
