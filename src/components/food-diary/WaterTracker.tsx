import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { Droplets, Plus, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WaterGoalSettings } from "./WaterGoalSettings";
import 'react-circular-progressbar/dist/styles.css';
import { REWARDS } from '@/constants/rewards';

const WATER_INCREMENT_ML = 200;

interface Profile {
  daily_water_goal_ml: number;
}

export const WaterTracker = () => {
  const { toast } = useToast();
  const [waterPercentage, setWaterPercentage] = useState(0);
  const [totalIntake, setTotalIntake] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('daily_water_goal_ml')
        .eq('id', user.id)
        .single();

      if (profile?.daily_water_goal_ml) {
        setDailyGoal(profile.daily_water_goal_ml);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadDailyWaterIntake = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('water_intake')
        .select('amount_ml')
        .eq('user_id', user.id)
        .eq('intake_date', today);

      if (error) throw error;

      const totalIntake = data?.reduce((sum, record) => sum + (record.amount_ml || 0), 0) || 0;
      setTotalIntake(totalIntake);

      if (dailyGoal) {
        const percentage = Math.min(100, Math.round((totalIntake / dailyGoal) * 100));
        setWaterPercentage(percentage);
      }
    } catch (error) {
      console.error('Error loading water intake:', error);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (dailyGoal) {
      loadDailyWaterIntake();
    }
  }, [dailyGoal]);

  useEffect(() => {
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
  }, [dailyGoal]);

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

      if (!dailyGoal) {
        toast({
          title: "Meta não definida",
          description: "Por favor, configure sua meta diária de água primeiro.",
        });
        setShowSettings(true);
        return;
      }

      const { error } = await supabase
        .from('water_intake')
        .insert({
          user_id: user.id,
          amount_ml: WATER_INCREMENT_ML,
        });

      if (error) throw error;

      await addTransaction({
        amount: REWARDS.WATER_INTAKE,
        type: 'water_reward',
        description: `Registro de ${WATER_INCREMENT_ML}ml de água`
      });

      toast({
        title: "Água registrada",
        description: `${WATER_INCREMENT_ML}ml de água registrados com sucesso. +${REWARDS.WATER_INTAKE} FITs`,
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
    <div className="space-y-4">
      <Card className="bg-white shadow-sm border-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplets className="w-6 h-6 text-primary-500" />
              <h2 className="text-xl font-semibold text-gray-900">Ingestão de água</h2>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2"
            >
              <Calculator className="h-5 w-5" />
              Calcular
            </Button>
          </div>

          {showSettings && (
            <WaterGoalSettings onGoalUpdated={() => {
              loadUserProfile();
              setShowSettings(false);
            }} />
          )}

          {dailyGoal ? (
            <>
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
              <div className="mt-4 text-center">
                <p className="text-gray-600 mb-2">
                  Meta diária: {dailyGoal}ml
                </p>
                <p className="text-gray-600 mb-4">
                  Consumido hoje: {totalIntake}ml
                </p>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 my-4">
              <p>Configure sua meta diária de água</p>
              <p>baseada no seu peso.</p>
            </div>
          )}

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
    </div>
  );
};
