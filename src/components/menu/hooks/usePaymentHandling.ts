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
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(false);

  useEffect(() => {
    const loadPrice = async () => {
      const price = await fetchCurrentPrice(planType);
      setCurrentPrice(price);
    };
    loadPrice();
    checkPaymentEnabled();
  }, [planType]);

  const checkPaymentEnabled = async () => {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) {
        console.warn('User not authenticated when checking payment settings');
        return;
      }

      const { data: settings, error: settingsError } = await supabase
        .from('payment_settings')
        .select('is_active')
        .eq('plan_type', planType)
        .maybeSingle();

      if (settingsError) {
        console.error('Error checking payment settings:', settingsError);
        return;
      }

      if (!settings?.is_active) {
        setIsPaymentEnabled(false);
        setHasPaid(true);
        return;
      }

      const { data: planAccess, error: accessError } = await supabase
        .from('plan_access')
        .select('payment_required')
        .eq('user_id', userData.user.id)
        .eq('plan_type', planType)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (accessError && accessError.code !== 'PGRST116') {
        console.error('Error checking user access:', accessError);
        setIsPaymentEnabled(true);
        return;
      }

      if (planAccess && !planAccess.payment_required) {
        setIsPaymentEnabled(false);
        setHasPaid(true);
        return;
      }

      const { data: counts, error: countError } = await supabase
        .from('plan_generation_counts')
        .select(`${planType}_count`)
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (countError) {
        console.error('Error checking plan generation counts:', countError);
        return;
      }

      const currentCount = counts ? counts[`${planType}_count`] || 0 : 0;
      
      if (currentCount < 3) {
        setIsPaymentEnabled(false);
        setHasPaid(true);
      } else {
        setIsPaymentEnabled(true);
        setHasPaid(false);
      }
    } catch (error) {
      console.error('Error checking payment settings:', error);
      setIsPaymentEnabled(true);
    }
  };

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

      checkPayment();

      const intervalId = window.setInterval(checkPayment, 5000);
      setCheckInterval(intervalId);

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

      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: paymentSettings, error: settingsError } = await supabase
        .from('payment_settings')
        .select('is_active')
        .eq('plan_type', planType)
        .single();

      if (settingsError) {
        console.error('Erro ao verificar configuração de pagamento:', settingsError);
        throw new Error('Erro ao verificar configuração de pagamento');
      }

      if (!paymentSettings?.is_active) {
        console.log('Pagamento não está ativo globalmente, permitindo acesso');
        setHasPaid(true);
        setShowConfirmation(true);
        return;
      }

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

      if (planAccess && !planAccess.payment_required) {
        console.log('Usuário tem acesso especial, permitindo acesso sem pagamento');
        setHasPaid(true);
        setShowConfirmation(true);
        return;
      }

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

      if (currentCount < 3) {
        console.log('Usuário ainda tem gerações gratuitas disponíveis');
        setHasPaid(true);
        setShowConfirmation(true);
        return;
      }

      const { preferenceId: newPreferenceId, initPoint } = await createPaymentPreference(planType, currentPrice);
      setPreferenceId(newPreferenceId);
      
      const successUrl = new URL(window.location.href);
      successUrl.searchParams.set('status', 'success');
      successUrl.searchParams.set('message', getSuccessMessage(planType));
      
      const paymentUrl = new URL(initPoint);
      paymentUrl.searchParams.set('back_urls_success', successUrl.toString());
      
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
    confirmationMessage: getSuccessMessage(planType),
    isPaymentEnabled
  };
};
