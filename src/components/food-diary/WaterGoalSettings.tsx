
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Weight } from "lucide-react";

interface WaterGoalSettingsProps {
  onGoalUpdated: () => void;
}

export const WaterGoalSettings = ({ onGoalUpdated }: WaterGoalSettingsProps) => {
  const [weight, setWeight] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleUpdateGoal = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const weightNum = parseFloat(weight);

      if (isNaN(weightNum)) {
        toast.error("Por favor, insira um peso válido");
        return;
      }

      const { error } = await (supabase.rpc as any)('update_user_water_goal', {
        _goal_ml: Math.round(weightNum * 35) // 35ml por kg de peso corporal
      });

      if (error) throw error;

      toast.success("Meta de água atualizada com sucesso!");
      onGoalUpdated();
      setWeight("");
    } catch (error) {
      console.error("Error updating water goal:", error);
      toast.error("Erro ao atualizar meta de água");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white shadow-sm border-none mb-4">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Configurar Meta de Água</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Weight className="w-5 h-5 text-gray-400" />
            <Input
              type="number"
              placeholder="Peso (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="flex-1"
            />
          </div>
          <Button
            onClick={handleUpdateGoal}
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600"
          >
            {loading ? "Atualizando..." : "Calcular Meta"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
