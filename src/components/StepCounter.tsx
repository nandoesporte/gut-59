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

interface AccelerationData {
  x: number;
  y: number;
  z: number;
}

const StepCounter = () => {
  const [steps, setSteps] = useState(0);
  const [goalSteps] = useState(10000);
  const [lastAcceleration, setLastAcceleration] = useState<AccelerationData>({ x: 0, y: 0, z: 0 });
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const { addTransaction } = useWallet();
  const [lastRewardDate, setLastRewardDate] = useState<string | null>(null);
  const [lastStepTime, setLastStepTime] = useState(0);
  const [accelerationBuffer, setAccelerationBuffer] = useState<number[]>([]);

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

  const calculateMagnitude = (acc: AccelerationData): number => {
    return Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
  };

  const movingAverage = (buffer: number[], windowSize: number = 5): number => {
    if (buffer.length === 0) return 0;
    const sum = buffer.slice(-windowSize).reduce((a, b) => a + b, 0);
    return sum / Math.min(windowSize, buffer.length);
  };

  const detectStep = (acceleration: AccelerationData) => {
    const now = Date.now();
    const magnitude = calculateMagnitude(acceleration);
    
    // Atualiza o buffer de aceleração
    setAccelerationBuffer(prev => {
      const newBuffer = [...prev, magnitude];
      return newBuffer.slice(-10); // Mantém os últimos 10 valores
    });

    // Parâmetros ajustáveis - reduzidos para maior sensibilidade
    const minStepInterval = 200; // Tempo mínimo entre passos (ms)
    const magnitudeThreshold = 1.5; // Reduzido de 12 para 1.5
    const averageThreshold = 1.2; // Reduzido de 10 para 1.2
    
    // Calcula a média móvel
    const avgMagnitude = movingAverage(accelerationBuffer);
    
    // Calcula a diferença de aceleração
    const diffY = Math.abs(acceleration.y - lastAcceleration.y);
    const timeSinceLastStep = now - lastStepTime;

    // Condições para detectar um passo - simplificadas e mais sensíveis
    const isStepPattern = (diffY > magnitudeThreshold || magnitude > averageThreshold) &&
                         timeSinceLastStep > minStepInterval;

    if (isStepPattern) {
      setSteps(prev => prev + 1);
      setLastStepTime(now);
      console.log('Passo detectado:', {
        magnitude,
        avgMagnitude,
        diffY,
        timeSinceLastStep
      });
    }
    
    setLastAcceleration({
      x: acceleration.x,
      y: acceleration.y,
      z: acceleration.z
    });
  };

  useEffect(() => {
    let sensor: any = null;

    const startAccelerometer = async () => {
      if (permission !== 'granted') return;

      try {
        // @ts-ignore
        sensor = new Accelerometer({ 
          frequency: 60, // Aumentado para melhor detecção
        });
        
        let lastProcessTime = 0;
        const processInterval = 16; // ~60Hz para maior responsividade

        sensor.addEventListener('reading', () => {
          const now = Date.now();
          if (now - lastProcessTime >= processInterval) {
            detectStep({
              x: sensor.x,
              y: sensor.y,
              z: sensor.z
            });
            lastProcessTime = now;
          }
        });

        sensor.start();
        console.log('Acelerômetro iniciado');
      } catch (error) {
        console.error('Erro ao iniciar acelerômetro:', error);
        toast.error('Erro ao iniciar o contador de passos');
      }
    };

    startAccelerometer();

    return () => {
      if (sensor) {
        try {
          sensor.stop();
          console.log('Acelerômetro parado');
        } catch (error) {
          console.error('Erro ao parar acelerômetro:', error);
        }
      }
    };
  }, [permission]);

  const requestPermission = async () => {
    try {
      console.log('Solicitando permissão para o acelerômetro');
      const result = await (navigator.permissions as any).query({ 
        name: 'accelerometer' 
      });

      console.log('Resultado da permissão:', result.state);
      setPermission(result.state);
      
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

      const { error: rewardError } = await supabase
        .from('step_rewards')
        .insert({
          user_id: user.id,
          steps: steps,
          reward_date: today
        });

      if (rewardError) throw rewardError;

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

  const calories = Math.round(steps * 0.05);
  const distance = ((steps * 0.762) / 1000).toFixed(2);

  return (
    <Card className="bg-gradient-to-br from-primary-50 to-white border-none shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-primary-600">
          <Footprints className="w-6 h-6" />
          Atividade Diária
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {permission !== 'granted' ? (
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
