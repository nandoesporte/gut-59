
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
        const { data: planAccess } = await supabase
          .from('plan_access')
          .select('plan_type, payment_required')
          .eq('user_id', user.id);

        if (planAccess) {
          const updatedRequirements = paymentRequirements.map(req => {
            const planStatus = planAccess.find(p => p.plan_type === req.planType);
            return {
              ...req,
              isRequired: planStatus ? planStatus.payment_required : true
            };
          });
          setPaymentRequirements(updatedRequirements);
        }
      } catch (error) {
        console.error('Error loading payment status:', error);
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

      const { error } = await supabase.functions.invoke('grant-plan-access', {
        body: {
          userId: user.id,
          planType: planType,
          disablePayment: requirement.isRequired
        }
      });

      if (error) throw error;

      setPaymentRequirements(prev => prev.map(r => 
        r.planType === planType ? 
        { ...r, isRequired: !r.isRequired, isDisabling: false } : 
        r
      ));

      toast.success(`Requisito de pagamento ${!requirement.isRequired ? 'ativado' : 'desativado'} com sucesso`);
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
