
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { User } from "../types";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentRequirement {
  planType: 'nutrition' | 'workout' | 'rehabilitation';
  isRequired: boolean;
  isDisabling: boolean;
}

interface UserDetailsDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onSendMessage?: () => Promise<void>;
  newMessage?: string;
  onMessageChange?: (value: string) => void;
  loading?: boolean;
}

const planLabels = {
  nutrition: 'Plano Nutricional',
  workout: 'Plano de Treino',
  rehabilitation: 'Plano de Fisioterapia'
};

export const UserDetailsDialog = ({
  user,
  open,
  onOpenChange,
  onEdit,
  onSendMessage,
  newMessage = "",
  onMessageChange,
  loading = false,
}: UserDetailsDialogProps) => {
  const [paymentRequirements, setPaymentRequirements] = useState<PaymentRequirement[]>([
    { planType: 'nutrition', isRequired: true, isDisabling: false },
    { planType: 'workout', isRequired: true, isDisabling: false },
    { planType: 'rehabilitation', isRequired: true, isDisabling: false }
  ]);

  useEffect(() => {
    const loadPaymentStatus = async () => {
      if (!user?.id || !open) return;

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
  }, [open, user?.id]);

  const handleTogglePaymentRequirement = async (planType: 'nutrition' | 'workout' | 'rehabilitation') => {
    if (!user?.id) return;

    try {
      // Find and update the specific plan requirement
      const requirement = paymentRequirements.find(r => r.planType === planType);
      if (!requirement) return;

      // Set loading state for this specific plan
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

      // Update local state
      setPaymentRequirements(prev => prev.map(r => 
        r.planType === planType ? 
        { ...r, isRequired: !r.isRequired, isDisabling: false } : 
        r
      ));

      toast.success(`Requisito de pagamento ${!requirement.isRequired ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao alterar requisito de pagamento:', error);
      toast.error("Erro ao alterar requisito de pagamento");
      
      // Reset loading state on error
      setPaymentRequirements(prev => prev.map(r => 
        r.planType === planType ? { ...r, isDisabling: false } : r
      ));
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Informações Básicas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nome</p>
                <p>{user.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{user.email || '-'}</p>
              </div>
            </div>
          </div>

          <Separator />

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

          {onEdit && (
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={onEdit}
              >
                Editar
              </Button>
            </div>
          )}

          {onSendMessage && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-2">
                <Label>Nova Mensagem</Label>
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => onMessageChange?.(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    disabled={loading}
                  />
                  <Button
                    onClick={onSendMessage}
                    disabled={!newMessage?.trim() || loading}
                  >
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
