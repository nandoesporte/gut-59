
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { initMercadoPago } from "@mercadopago/sdk-react";

export interface PaymentResponse {
  id: string;
  status: string;
  preferenceId: string;  // Added this property
}

// Initialize MercadoPago with the test public key
initMercadoPago('TEST-5cc34aa1-d681-40a3-9b1a-5648d21af83b', {
  locale: 'pt-BR'
});

export const createPayment = async (): Promise<PaymentResponse> => {
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error('Erro ao obter dados do usuário');
    }

    if (!userData.user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('Iniciando criação de pagamento para usuário:', userData.user.id);

    const { data, error } = await supabase.functions.invoke('create-mercadopago-payment', {
      body: {
        userId: userData.user.id,
        amount: 19.90,
        description: "Plano Alimentar Personalizado"
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      toast.error('Falha ao criar pagamento. Por favor, tente novamente.');
      throw error;
    }

    if (!data) {
      console.error('No data received from edge function');
      throw new Error('Não foi possível processar o pagamento no momento');
    }

    console.log('Resposta do serviço de pagamento:', data);

    if (!data.id || !data.preferenceId) {
      console.error('Invalid response structure:', data);
      throw new Error('Resposta inválida do serviço de pagamento');
    }

    return {
      id: data.id,
      status: data.status,
      preferenceId: data.preferenceId
    };
  } catch (error) {
    console.error('Erro detalhado ao criar pagamento:', error);
    throw error;
  }
};

export const checkPaymentStatus = async (paymentId: string): Promise<boolean> => {
  try {
    if (!paymentId) {
      console.error('Payment ID não fornecido');
      throw new Error('ID do pagamento é obrigatório');
    }

    console.log('Verificando status do pagamento:', paymentId);

    const { data, error } = await supabase.functions.invoke('check-asaas-payment', {
      body: { paymentId }
    });

    if (error) {
      console.error('Edge function error:', error);
      toast.error('Erro ao verificar status do pagamento');
      throw error;
    }

    if (!data) {
      console.error('No data received from status check');
      throw new Error('Não foi possível verificar o status do pagamento');
    }

    console.log('Status do pagamento recebido:', data);

    if (!data.status) {
      console.error('Invalid status response:', data);
      throw new Error('Status do pagamento inválido');
    }

    // Lista completa de status que indicam pagamento confirmado
    const confirmedStatuses = ['CONFIRMED', 'RECEIVED', 'APPROVED', 'PAYMENT_CONFIRMED'];
    return confirmedStatuses.includes(data.status.toUpperCase());
  } catch (error) {
    console.error('Erro detalhado ao verificar status:', error);
    throw error;
  }
};
