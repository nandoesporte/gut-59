
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Droplets, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const WaterTracker = () => {
  const { toast } = useToast();
  const [waterPercentage, setWaterPercentage] = useState(55);

  const handleAddWater = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado. Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('water_intake')
        .insert({
          user_id: user.id,
          amount_ml: 200,
        });

      if (error) throw error;

      setWaterPercentage(prev => Math.min(100, prev + 5));

      toast({
        title: "Água registrada",
        description: "200ml de água registrados com sucesso.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível registrar a água. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white shadow-sm border-none">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Droplets className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-gray-900">Ingestão de água</h2>
        </div>
        <div className="w-32 h-32 mx-auto">
          <CircularProgressbar
            value={waterPercentage}
            text={`${waterPercentage}%`}
            styles={buildStyles({
              textSize: '16px',
              pathColor: '#34D399',
              textColor: '#34D399',
              trailColor: '#E5E7EB',
            })}
          />
        </div>
        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleAddWater}
            className="bg-primary-50 hover:bg-primary-100 text-primary-500"
            variant="ghost"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar 200ml
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaterTracker;
