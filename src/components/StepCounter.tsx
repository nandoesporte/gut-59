
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Footprints } from 'lucide-react';
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
        .select<'step_rewards', StepReward>('reward_date')
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
        } as StepReward);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Footprints className="w-6 h-6" />
          Contador de Passos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sensorState.supported ? (
          <div className="text-center text-muted-foreground">
            Seu dispositivo não suporta o contador de passos
          </div>
        ) : sensorState.permission !== 'granted' ? (
          <Button onClick={requestPermission} className="w-full">
            Permitir Acesso ao Sensor
          </Button>
        ) : (
          <>
            <div className="text-center">
              <span className="text-4xl font-bold">{steps}</span>
              <span className="text-muted-foreground"> / {goalSteps} passos</span>
            </div>
            <Progress value={progress} className="w-full" />
            <Button
              onClick={handleRewardSteps}
              disabled={!canReceiveReward}
              className="w-full"
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
