
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { Droplets, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import 'react-circular-progressbar/dist/styles.css';

const DAILY_GOAL_ML = 2500;
const WATER_INCREMENT_ML = 200;

export const WaterTracker = () => {
  const { toast } = useToast();
  const [waterPercentage, setWaterPercentage] = useState(0);

  const loadDailyWaterIntake = async () => {
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

      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

      const { data, error } = await supabase
        .from('water_intake')
        .select('amount_ml')
        .eq('user_id', user.id)
        .eq('intake_date', today);

      if (error) throw error;

      const totalIntake = data?.reduce((sum, record) => sum + (record.amount_ml || 0), 0) || 0;
      const percentage = Math.min(100, Math.round((totalIntake / DAILY_GOAL_ML) * 100));
      setWaterPercentage(percentage);
    } catch (error) {
      console.error('Error loading water intake:', error);
    }
  };

  useEffect(() => {
    loadDailyWaterIntake();
    
    // Set up real-time subscription for water intake updates
    const channel = supabase
      .channel('water_intake_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'water_intake',
        },
        () => {
          loadDailyWaterIntake();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

      // Check if adding more water would exceed the daily goal
      const newPercentage = (waterPercentage * DAILY_GOAL_ML + WATER_INCREMENT_ML) / DAILY_GOAL_ML * 100;
      if (newPercentage > 100) {
        toast({
          title: "Limite diário atingido",
          description: "Você já atingiu sua meta diária de água!",
        });
        return;
      }

      const { error } = await supabase
        .from('water_intake')
        .insert({
          user_id: user.id,
          amount_ml: WATER_INCREMENT_ML,
        });

      if (error) throw error;

      toast({
        title: "Água registrada",
        description: `${WATER_INCREMENT_ML}ml de água registrados com sucesso.`,
      });

      await loadDailyWaterIntake();
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
          <Droplets className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-semibold text-gray-900">Ingestão de água</h2>
        </div>
        <div className="w-32 h-32 mx-auto">
          <CircularProgressbar
            value={waterPercentage}
            text={`${waterPercentage}%`}
            styles={buildStyles({
              textSize: '18px',
              pathColor: '#34D399',
              textColor: '#34D399',
              trailColor: '#E5E7EB',
            })}
          />
        </div>
        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleAddWater}
            className="bg-primary-50 hover:bg-primary-100 text-primary-500 text-base"
            variant="ghost"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar {WATER_INCREMENT_ML}ml
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
