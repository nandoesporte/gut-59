
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { PaymentRequirement, planLabels } from "../types/dialog-types";
import { User } from "../../types";

interface PaymentSettingsProps {
  user: User;
}

export const PaymentSettings = ({ user }: PaymentSettingsProps) => {
  const [paymentRequirements, setPaymentRequirements] = useState<PaymentRequirement[]>([
    { planType: 'nutrition', isRequired: true, isDisabling: false },
    { planType: 'workout', isRequired: true, isDisabling: false },
    { planType: 'rehabilitation', isRequired: true, isDisabling: false }
  ]);

  useEffect(() => {
    const loadPaymentStatus = async () => {
      if (!user?.id) return;

      try {
        // Buscar configurações de pagamento globais
        const { data: paymentSettings, error: settingsError } = await supabase
          .from('payment_settings')
          .select('plan_type, is_active')
          .in('plan_type', ['nutrition', 'workout', 'rehabilitation']);

        if (settingsError) throw settingsError;

        // Buscar configurações específicas do usuário
        const { data: planAccess, error: accessError } = await supabase
          .from('plan_access')
          .select('plan_type, payment_required')
          .eq('user_id', user.id);

        if (accessError) throw accessError;

        const updatedRequirements = paymentRequirements.map(req => {
          const globalSetting = paymentSettings?.find(s => s.plan_type === req.planType);
          const userSetting = planAccess?.find(p => p.plan_type === req.planType);
          
          // Payment is required if global setting is active and user doesn't have special access
          const isRequired = globalSetting?.is_active && 
            (!userSetting || userSetting.payment_required);

          return {
            ...req,
            isRequired
          };
        });

        setPaymentRequirements(updatedRequirements);
      } catch (error) {
        console.error('Error loading payment status:', error);
        toast.error('Erro ao carregar configurações de pagamento');
      }
    };

    loadPaymentStatus();
  }, [user?.id]);

  const handleTogglePaymentRequirement = async (planType: 'nutrition' | 'workout' | 'rehabilitation') => {
    if (!user?.id) return;

    try {
      const requirement = paymentRequirements.find(r => r.planType === planType);
      if (!requirement) return;

      setPaymentRequirements(prev => prev.map(r => 
        r.planType === planType ? { ...r, isDisabling: true } : r
      ));

      // Atualizar configuração global de pagamento
      const { error: updateSettingError } = await supabase
        .from('payment_settings')
        .upsert({
          plan_type: planType,
          is_active: !requirement.isRequired,
          price: 19.90 // Mantém o preço padrão
        }, {
          onConflict: 'plan_type'
        });

      if (updateSettingError) throw updateSettingError;

      // Primeiro, delete registros existentes para esse usuário e tipo de plano
      await supabase
        .from('plan_access')
        .delete()
        .match({ 
          user_id: user.id, 
          plan_type: planType 
        });

      // Agora insere o novo registro de acesso do usuário
      const { error: insertError } = await supabase
        .from('plan_access')
        .insert({
          user_id: user.id,
          plan_type: planType,
          payment_required: !requirement.isRequired,
          is_active: true
        });

      if (insertError) throw insertError;

      // Atualiza o estado local
      setPaymentRequirements(prev => prev.map(r => 
        r.planType === planType ? 
        { ...r, isRequired: !r.isRequired, isDisabling: false } : 
        r
      ));

      toast.success(`Requisito de pagamento ${requirement.isRequired ? 'desativado' : 'ativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao alterar requisito de pagamento:', error);
      toast.error("Erro ao alterar requisito de pagamento");
      
      setPaymentRequirements(prev => prev.map(r => 
        r.planType === planType ? { ...r, isDisabling: false } : r
      ));
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Configurações de Pagamento</h3>
      <div className="space-y-4">
        {paymentRequirements.map((requirement) => (
          <div key={requirement.planType} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="font-medium">Requisito de Pagamento - {planLabels[requirement.planType]}</h4>
              <p className="text-sm text-muted-foreground">
                Ative ou desative o requisito de pagamento para o {planLabels[requirement.planType].toLowerCase()}
              </p>
            </div>
            <Switch
              checked={requirement.isRequired}
              onCheckedChange={() => handleTogglePaymentRequirement(requirement.planType)}
              disabled={requirement.isDisabling || !user.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
