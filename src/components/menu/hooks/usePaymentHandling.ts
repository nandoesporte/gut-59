
import { useState, useEffect } from "react";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCurrentPrice } from "../utils/payment-db";
import { getSuccessMessage } from "../utils/payment-messages";
import { createPaymentPreference, checkPaymentStatus } from "../utils/payment-processor";

type PlanType = 'nutrition' | 'workout' | 'rehabilitation';

// Initialize MercadoPago with public key
initMercadoPago('APP_USR-64b85a56-267c-4056-9484-a2ff9e037db4', {
  locale: 'pt-BR'
});

export const usePaymentHandling = (planType: PlanType = 'nutrition') => {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(19.90);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [checkInterval, setCheckInterval] = useState<number | null>(null);

  useEffect(() => {
    const loadPrice = async () => {
      const price = await fetchCurrentPrice(planType);
      setCurrentPrice(price);
    };
    loadPrice();
  }, [planType]);

  // Effect to check payment status and notification channel
  useEffect(() => {
    const startPaymentCheck = async () => {
      if (!preferenceId || hasPaid) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) return;

      const checkPayment = async () => {
        console.log(`Verificando status do pagamento ${preferenceId}...`);
        const isPaid = await checkPaymentStatus(
          preferenceId,
          userData.user.id,
          planType,
          currentPrice,
          () => {
            setHasPaid(true);
            setShowConfirmation(true);
            toast.success("Pagamento confirmado com sucesso!");
          }
        );

        if (isPaid) {
          console.log('Pagamento confirmado, parando verificação...');
          if (checkInterval) {
            window.clearInterval(checkInterval);
            setCheckInterval(null);
          }
          setHasPaid(true);
        }
      };

      // Inicia verificação imediata
      checkPayment();

      // Configura intervalo de 5 segundos
      const intervalId = window.setInterval(checkPayment, 5000);
      setCheckInterval(intervalId);

      // Limpa intervalo após 10 minutos
      const timeoutId = window.setTimeout(() => {
        window.clearInterval(intervalId);
        setCheckInterval(null);
      }, 600000);

      return () => {
        window.clearInterval(intervalId);
        window.clearTimeout(timeoutId);
      };
    };

    startPaymentCheck();

    // Subscribe to payment notifications channel
    const channel = supabase
      .channel('payment_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'payment_notifications',
        filter: `plan_type=eq.${planType}`
      }, async (payload) => {
        console.log('Notificação de pagamento recebida:', payload);
        
        if (payload.new.status === 'completed') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id === payload.new.user_id) {
            setHasPaid(true);
            setShowConfirmation(true);
            
            // Reproduzir som de notificação
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
            
            toast.success("Pagamento confirmado com sucesso!", {
              description: "Seu plano foi liberado! Você pode gerar até 3 planos.",
              duration: 6000,
            });
          }
        }
      })
      .subscribe();

    return () => {
      if (checkInterval) {
        window.clearInterval(checkInterval);
      }
      supabase.removeChannel(channel);
    };
  }, [preferenceId, hasPaid, planType, currentPrice]);

  const handlePaymentAndContinue = async () => {
    try {
      setIsProcessingPayment(true);

      // Get user data
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar primeiro se o pagamento está habilitado
      const { data: paymentSettings, error: settingsError } = await supabase
        .from('payment_settings')
        .select('is_active')
        .eq('plan_type', planType)
        .single();

      if (settingsError) {
        console.error('Erro ao verificar configuração de pagamento:', settingsError);
        throw new Error('Erro ao verificar configuração de pagamento');
      }

      // Se o pagamento não estiver ativo globalmente, permitir continuar sem pagamento
      if (!paymentSettings?.is_active) {
        console.log('Pagamento não está ativo globalmente, permitindo acesso');
        setHasPaid(true);
        setShowConfirmation(true);
        return;
      }

      // Verificar acesso específico do usuário - pegando apenas o registro mais recente
      const { data: planAccess, error: accessError } = await supabase
        .from('plan_access')
        .select('payment_required, created_at')
        .eq('user_id', userData.user.id)
        .eq('plan_type', planType)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (accessError && accessError.code !== 'PGRST116') {
        console.error('Erro ao verificar acesso do usuário:', accessError);
        throw new Error('Erro ao verificar acesso do usuário');
      }

      // Se o usuário tiver acesso especial sem necessidade de pagamento
      if (planAccess && !planAccess.payment_required) {
        console.log('Usuário tem acesso especial, permitindo acesso sem pagamento');
        setHasPaid(true);
        setShowConfirmation(true);
        return;
      }

      // Verificar contagem de gerações
      const { data: counts, error: countError } = await supabase
        .from('plan_generation_counts')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (countError) {
        console.error('Erro ao verificar contagem de gerações:', countError);
        throw new Error('Erro ao verificar limite de gerações');
      }

      const countField = `${planType}_count`;
      const currentCount = counts ? counts[countField] || 0 : 0;

      // Se ainda tiver gerações gratuitas disponíveis
      if (currentCount < 3) {
        console.log('Usuário ainda tem gerações gratuitas disponíveis');
        setHasPaid(true);
        setShowConfirmation(true);
        return;
      }

      // Se chegou aqui, precisa criar preferência de pagamento
      const { preferenceId: newPreferenceId, initPoint } = await createPaymentPreference(planType, currentPrice);
      setPreferenceId(newPreferenceId);
      
      // Add success URL with message
      const successUrl = new URL(window.location.href);
      successUrl.searchParams.set('status', 'success');
      successUrl.searchParams.set('message', getSuccessMessage(planType));
      
      // Add the success URL to the payment window URL
      const paymentUrl = new URL(initPoint);
      paymentUrl.searchParams.set('back_urls_success', successUrl.toString());
      
      // Open payment window
      window.open(paymentUrl.toString(), '_blank');

    } catch (error: any) {
      console.error('Erro completo:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar pagamento");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return {
    isProcessingPayment,
    preferenceId,
    hasPaid,
    currentPrice,
    handlePaymentAndContinue,
    showConfirmation,
    setShowConfirmation,
    confirmationMessage: getSuccessMessage(planType)
  };
};
