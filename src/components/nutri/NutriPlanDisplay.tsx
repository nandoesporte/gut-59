
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NutriPreferences } from "./types";
import { RefreshCw, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NutriPlanDisplayProps {
  preferences: NutriPreferences;
  onReset: () => void;
}

export const NutriPlanDisplay = ({ preferences, onReset }: NutriPlanDisplayProps) => {
  const { data: nutriPlan, isLoading } = useQuery({
    queryKey: ['nutri-plan', preferences],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const response = await supabase.functions.invoke('generate-nutri-plan', {
        body: { preferences, userId: userData.user.id }
      });

      if (response.error) throw response.error;
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Gerando seu plano nutricional personalizado...</p>
      </div>
    );
  }

  if (!nutriPlan) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-600">
          Ocorreu um erro ao gerar o plano nutricional. Por favor, tente novamente.
        </p>
        <Button onClick={onReset} className="mt-4 mx-auto block">
          Tentar Novamente
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Seu Plano Nutricional Personalizado</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refazer
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* TODO: Implementar visualização do plano nutricional */}
      <Card className="p-6">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(nutriPlan, null, 2)}
        </pre>
      </Card>
    </div>
  );
};
