
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
        const { data: planAccess, error } = await supabase
          .from('plan_access')
          .select('plan_type, payment_required')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error loading payment status:', error);
          toast.error('Erro ao carregar configurações de pagamento');
          return;
        }

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

      // Update local state first to show loading state
      setPaymentRequirements(prev => prev.map(r => 
        r.planType === planType ? { ...r, isDisabling: true } : r
      ));

      // Check if there's an existing plan access
      const { data: existingAccess, error: queryError } = await supabase
        .from('plan_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_type', planType)
        .maybeSingle();

      if (queryError) throw queryError;

      if (existingAccess) {
        // Update existing plan access
        const { error: updateError } = await supabase
          .from('plan_access')
          .update({
            payment_required: !requirement.isRequired,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('plan_type', planType);

        if (updateError) throw updateError;
      } else {
        // Create new plan access
        const { error: insertError } = await supabase
          .from('plan_access')
          .insert({
            user_id: user.id,
            plan_type: planType,
            payment_required: !requirement.isRequired,
            is_active: true
          });

        if (insertError) throw insertError;
      }

      // Update local state with new value
      setPaymentRequirements(prev => prev.map(r => 
        r.planType === planType ? 
        { ...r, isRequired: !r.isRequired, isDisabling: false } : 
        r
      ));

      toast.success(`Requisito de pagamento ${requirement.isRequired ? 'desativado' : 'ativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao alterar requisito de pagamento:', error);
      toast.error("Erro ao alterar requisito de pagamento");
      
      // Revert loading state on error
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
