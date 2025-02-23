import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentHandling } from "@/components/menu/hooks/usePaymentHandling";

interface PreferencesFormProps {
  onSubmit: (preferences: Preferences) => void;
}

interface Preferences {
  trainingDays: string;
  trainingTime: string;
  level: string;
}

export const PreferencesForm = ({ onSubmit }: PreferencesFormProps) => {
  const [preferences, setPreferences] = useState<Preferences>({
    trainingDays: "",
    trainingTime: "",
    level: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleTermsChange = (checked: boolean) => {
    setTermsAccepted(checked);
  };

  const {
    isProcessingPayment,
    hasPaid,
    currentPrice,
    handlePaymentAndContinue,
    showConfirmation,
    setShowConfirmation
  } = usePaymentHandling('workout'); // Note the 'workout' plan type

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Você precisa estar logado para continuar");
      return;
    }

    try {
      // Grant access to workout plan
      const { error: grantError } = await supabase.functions.invoke('grant-plan-access', {
        body: {
          userId: user.id,
          planType: 'workout' as const // Explicitly type as 'workout'
        }
      });

      if (grantError) {
        console.error('Erro ao liberar acesso ao plano:', grantError);
        toast.error("Erro ao liberar acesso ao plano. Por favor, contate o suporte.");
        return;
      }

      // If access was granted successfully, proceed with form submission
      onSubmit(preferences);
    } catch (error) {
      console.error('Erro ao processar requisição:', error);
      toast.error("Erro ao processar sua solicitação. Por favor, tente novamente.");
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Preferências de Treino</h3>

        <div>
          <Label htmlFor="trainingDays">Dias de Treino</Label>
          <Input
            type="text"
            id="trainingDays"
            name="trainingDays"
            value={preferences.trainingDays}
            onChange={handleInputChange}
            placeholder="Ex: Seg, Qua, Sex"
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="trainingTime">Horário de Treino</Label>
          <Input
            type="time"
            id="trainingTime"
            name="trainingTime"
            value={preferences.trainingTime}
            onChange={handleInputChange}
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="level">Nível de Experiência</Label>
          <select
            id="level"
            name="level"
            value={preferences.level}
            onChange={handleInputChange}
            className="w-full border rounded-md py-2 px-3"
          >
            <option value="">Selecione</option>
            <option value="beginner">Iniciante</option>
            <option value="intermediate">Intermediário</option>
            <option value="advanced">Avançado</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="terms"
            checked={termsAccepted}
            onCheckedChange={handleTermsChange}
            className="data-[state=checked]:bg-green-500"
          />
          <Label htmlFor="terms">Aceito os termos e condições</Label>
        </div>
      </div>

      <Button type="submit" className="w-full bg-green-500 hover:bg-green-600" disabled={!termsAccepted}>
        Gerar Plano de Treino
      </Button>
    </form>
  );
};
