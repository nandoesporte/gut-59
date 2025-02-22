
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

    const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
      body: {
        userId: userData.user.id,
        amount: 19.90,
        description: "Plano Alimentar Personalizado"
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    throw error;
  }
};

export const checkPaymentStatus = async (paymentId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-asaas-payment', {
      body: { paymentId }
    });

    if (error) throw error;
    return data.status === 'CONFIRMED' || data.status === 'RECEIVED';
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    throw error;
  }
};
