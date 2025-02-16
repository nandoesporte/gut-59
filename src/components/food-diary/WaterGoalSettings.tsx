
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ruler, Weight } from "lucide-react";

interface WaterGoalSettingsProps {
  onGoalUpdated: () => void;
}

export const WaterGoalSettings = ({ onGoalUpdated }: WaterGoalSettingsProps) => {
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleUpdateGoal = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const weightNum = parseFloat(weight);
      const heightNum = parseFloat(height);

      if (isNaN(weightNum) || isNaN(heightNum)) {
        toast.error("Por favor, insira valores válidos");
        return;
      }

      const { error } = await supabase.rpc('update_user_water_goal', {
        p_user_id: user.id,
        p_weight: weightNum,
        p_height: heightNum
      });

      if (error) throw error;

      toast.success("Meta de água atualizada com sucesso!");
      onGoalUpdated();
      setWeight("");
      setHeight("");
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
          <div className="flex items-center space-x-2">
            <Ruler className="w-5 h-5 text-gray-400" />
            <Input
              type="number"
              placeholder="Altura (cm)"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="flex-1"
            />
          </div>
          <Button
            onClick={handleUpdateGoal}
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600"
          >
            {loading ? "Atualizando..." : "Atualizar Meta"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
