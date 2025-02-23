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

interface UserDetailsDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserDetailsDialog = ({
  user,
  open,
  onOpenChange,
}: UserDetailsDialogProps) => {
  const [isNutritionPaymentRequired, setIsNutritionPaymentRequired] = useState(true);
  const [isDisablingPayment, setIsDisablingPayment] = useState(false);

  const handleTogglePaymentRequirement = async () => {
    try {
      setIsDisablingPayment(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { error } = await supabase.functions.invoke('grant-plan-access', {
        body: {
          userId: user.id,
          planType: 'nutrition',
          disablePayment: isNutritionPaymentRequired // Toggle the current state
        }
      });

      if (error) throw error;

      setIsNutritionPaymentRequired(!isNutritionPaymentRequired);
      toast.success(`Requisito de pagamento ${!isNutritionPaymentRequired ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao alterar requisito de pagamento:', error);
      toast.error("Erro ao alterar requisito de pagamento");
    } finally {
      setIsDisablingPayment(false);
    }
  };

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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="font-medium">Requisito de Pagamento - Plano Nutricional</h4>
                <p className="text-sm text-muted-foreground">
                  Ative ou desative o requisito de pagamento para o plano nutricional
                </p>
              </div>
              <Switch
                checked={isNutritionPaymentRequired}
                onCheckedChange={handleTogglePaymentRequirement}
                disabled={isDisablingPayment}
              />
            </div>
          </div>

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
