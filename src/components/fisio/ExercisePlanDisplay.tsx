
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FisioPreferences } from "./types";
import { RehabPlan } from "./types/rehab-plan";
import { Card } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";
import { WorkoutLoadingState } from "../workout/components/WorkoutLoadingState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { REWARDS } from '@/constants/rewards';
import { useWallet } from "@/hooks/useWallet";

interface ExercisePlanDisplayProps {
  preferences: FisioPreferences;
  onReset: () => void;
}

export const ExercisePlanDisplay = ({ preferences, onReset }: ExercisePlanDisplayProps) => {
  const { addTransaction } = useWallet();
  const [loading, setLoading] = useState(true);
  const [rehabPlan, setRehabPlan] = useState<RehabPlan | null>(null);

  const generatePlan = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: response, error } = await supabase.functions.invoke('generate-rehab-plan', {
        body: { preferences, userId: user.id }
      });

      if (error) throw error;
      if (!response) throw new Error("Nenhum plano foi gerado");

      if (response) {
        await addTransaction({
          amount: REWARDS.REHAB_PLAN,
          type: 'physio_plan',
          description: 'Geração de plano de reabilitação'
        });
        
        setRehabPlan(response);
        toast.success(`Plano de reabilitação gerado com sucesso! +${REWARDS.REHAB_PLAN} FITs`);
      }
    } catch (error: any) {
      console.error("Erro ao gerar plano:", error);
      toast.error(error.message || "Erro ao gerar plano de reabilitação");
      setRehabPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePlan();
  }, []);

  if (loading) {
    return <WorkoutLoadingState message="Gerando seu plano de reabilitação personalizado" />;
  }

  if (!rehabPlan) {
    return (
      <div className="text-center space-y-4 p-12">
        <h3 className="text-xl font-semibold text-red-600">
          Erro ao gerar o plano de reabilitação
        </h3>
        <p className="text-muted-foreground">
          Não foi possível gerar seu plano. Por favor, tente novamente.
        </p>
        <Button onClick={onReset} variant="outline" size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Seu Plano de Reabilitação
        </h2>
        <p className="text-gray-600">
          Plano gerado com sucesso! A visualização detalhada será implementada em breve.
        </p>
      </Card>
      
      <div className="flex justify-center">
        <Button 
          onClick={onReset} 
          variant="outline"
          size="lg"
          className="hover:bg-primary/5"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Criar Novo Plano
        </Button>
      </div>
    </div>
  );
};
