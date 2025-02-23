
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentHandling } from "@/components/menu/hooks/usePaymentHandling";
import { WorkoutPreferences } from "./types";

interface PreferencesFormProps {
  onSubmit: (preferences: WorkoutPreferences) => void;
}

export const PreferencesForm = ({ onSubmit }: PreferencesFormProps) => {
  const [preferences, setPreferences] = useState<WorkoutPreferences>({
    age: 0,
    weight: 0,
    height: 0,
    gender: "male",
    goal: "maintain",
    activity_level: "moderate",
    preferred_exercise_types: ["strength"],
    available_equipment: [],
    health_conditions: []
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
  } = usePaymentHandling('workout');

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
          planType: 'workout' as const
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
          <Label htmlFor="age">Idade</Label>
          <Input
            type="number"
            id="age"
            name="age"
            value={preferences.age}
            onChange={handleInputChange}
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="weight">Peso (kg)</Label>
          <Input
            type="number"
            id="weight"
            name="weight"
            value={preferences.weight}
            onChange={handleInputChange}
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="height">Altura (cm)</Label>
          <Input
            type="number"
            id="height"
            name="height"
            value={preferences.height}
            onChange={handleInputChange}
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="gender">Gênero</Label>
          <select
            id="gender"
            name="gender"
            value={preferences.gender}
            onChange={handleInputChange}
            className="w-full border rounded-md py-2 px-3"
          >
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
          </select>
        </div>

        <div>
          <Label htmlFor="goal">Objetivo</Label>
          <select
            id="goal"
            name="goal"
            value={preferences.goal}
            onChange={handleInputChange}
            className="w-full border rounded-md py-2 px-3"
          >
            <option value="lose_weight">Perder Peso</option>
            <option value="maintain">Manter</option>
            <option value="gain_mass">Ganhar Massa</option>
          </select>
        </div>

        <div>
          <Label htmlFor="activity_level">Nível de Atividade</Label>
          <select
            id="activity_level"
            name="activity_level"
            value={preferences.activity_level}
            onChange={handleInputChange}
            className="w-full border rounded-md py-2 px-3"
          >
            <option value="sedentary">Sedentário</option>
            <option value="light">Leve</option>
            <option value="moderate">Moderado</option>
            <option value="intense">Intenso</option>
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
