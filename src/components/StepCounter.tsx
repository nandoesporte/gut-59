
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Footprints, Activity, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/hooks/useWallet';
import { REWARDS } from '@/constants/rewards';

interface StepReward {
  id: string;
  user_id: string;
  steps: number;
  reward_date: string;
  created_at: string;
}

const StepCounter = () => {
  const [steps, setSteps] = useState(0);
  const [goalSteps] = useState(10000);
  const [sensorState, setSensorState] = useState<{
    sensor: any;
    supported: boolean;
    permission: PermissionState | null;
  }>({ sensor: null, supported: false, permission: null });
  const { addTransaction } = useWallet();
  const [lastRewardDate, setLastRewardDate] = useState<string | null>(null);

  useEffect(() => {
    const loadLastRewardDate = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('step_rewards')
        .select('*')
        .eq('user_id', user.id)
        .order('reward_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setLastRewardDate(data.reward_date);
      }
    };

    loadLastRewardDate();
  }, []);

  useEffect(() => {
    const checkSensor = async () => {
      try {
        if ('Accelerometer' in window) {
          const permission = await (navigator.permissions as any).query({ name: 'accelerometer' });
          
          setSensorState({
            sensor: new (window as any).Accelerometer({ frequency: 60 }),
            supported: true,
            permission: permission.state
          });
        } else {
          setSensorState(prev => ({ ...prev, supported: false }));
          toast.error('Seu dispositivo não suporta o contador de passos');
        }
      } catch (error) {
        console.error('Erro ao verificar sensor:', error);
        setSensorState(prev => ({ ...prev, supported: false }));
        toast.error('Erro ao acessar o sensor');
      }
    };

    checkSensor();
  }, []);

  useEffect(() => {
    let stepDetector: any = null;
    
    const startCounting = async () => {
      try {
        if (!sensorState.supported || sensorState.permission !== 'granted') {
          return;
        }

        if ('StepDetector' in window) {
          stepDetector = new (window as any).StepDetector();
          stepDetector.addEventListener('stepcounter', () => {
            setSteps(prev => prev + 1);
          });
          
          await stepDetector.start();
        }
      } catch (error) {
        console.error('Erro ao iniciar contador:', error);
        toast.error('Erro ao iniciar o contador de passos');
      }
    };

    startCounting();

    return () => {
      if (stepDetector) {
        try {
          stepDetector.stop();
        } catch (error) {
          console.error('Erro ao parar contador:', error);
        }
      }
    };
  }, [sensorState.supported, sensorState.permission]);

  const requestPermission = async () => {
    try {
      const result = await (navigator.permissions as any).query({ name: 'accelerometer' });
      setSensorState(prev => ({ ...prev, permission: result.state }));
      
      if (result.state === 'granted') {
        toast.success('Permissão concedida!');
      } else {
        toast.error('Permissão negada');
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro ao solicitar permissão');
    }
  };

  const handleRewardSteps = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (lastRewardDate === today) {
        toast.error('Você já recebeu a recompensa hoje!');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Registra a recompensa
      const { error: rewardError } = await supabase
        .from('step_rewards')
        .insert({
          user_id: user.id,
          steps: steps,
          reward_date: today
        });

      if (rewardError) throw rewardError;

      // Adiciona os FITs
      await addTransaction({
        amount: REWARDS.STEPS,
        type: 'steps',
        description: `Recompensa por ${steps} passos`
      });

      setLastRewardDate(today);
      toast.success(`Parabéns! Você ganhou ${REWARDS.STEPS} FITs pelos seus passos!`);
    } catch (error) {
      console.error('Erro ao recompensar passos:', error);
      toast.error('Erro ao processar recompensa');
    }
  };

  const progress = Math.min((steps / goalSteps) * 100, 100);
  const today = new Date().toISOString().split('T')[0];
  const canReceiveReward = lastRewardDate !== today && steps > 0;

  // Cálculos estimados para calorias e distância
  const calories = Math.round(steps * 0.05); // Estimativa simples: 0.05 calorias por passo
  const distance = ((steps * 0.762) / 1000).toFixed(2); // Média de 76.2cm por passo, convertido para km

  return (
    <Card className="bg-gradient-to-br from-primary-50 to-white border-none shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-primary-600">
          <Footprints className="w-6 h-6" />
          Atividade Diária
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!sensorState.supported ? (
          <div className="text-center text-muted-foreground">
            Seu dispositivo não suporta o contador de passos
          </div>
        ) : sensorState.permission !== 'granted' ? (
          <Button 
            onClick={requestPermission} 
            className="w-full bg-primary hover:bg-primary-600 text-white"
          >
            Permitir contagem de passos
          </Button>
        ) : (
          <>
            <div className="text-center space-y-2">
              <span className="text-6xl font-bold text-primary-600">
                {steps.toLocaleString()}
              </span>
              <div className="text-sm text-muted-foreground">
                / {goalSteps.toLocaleString()} passos
              </div>
            </div>
            
            <Progress 
              value={progress} 
              className="h-2 w-full bg-primary-100"
              indicatorClassName="bg-primary"
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Activity className="w-4 h-4" />
                  Calorias
                </div>
                <div className="text-lg font-semibold text-primary-600">
                  {calories} kcal
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MapPin className="w-4 h-4" />
                  Distância
                </div>
                <div className="text-lg font-semibold text-primary-600">
                  {distance} km
                </div>
              </div>
            </div>

            <Button
              onClick={handleRewardSteps}
              disabled={!canReceiveReward}
              className="w-full bg-primary hover:bg-primary-600 text-white"
            >
              {lastRewardDate === today
                ? 'Recompensa já recebida hoje'
                : `Resgatar ${REWARDS.STEPS} FITs`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StepCounter;
