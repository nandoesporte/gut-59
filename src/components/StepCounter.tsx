
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
  timestamp: number;
}

const STORAGE_KEYS = {
  STEPS: 'stepCounter_steps',
  LAST_SYNC: 'stepCounter_lastSync',
  PERMISSION_GRANTED: 'stepCounter_permissionGranted',
  LAST_STEP_TIME: 'stepCounter_lastStepTime'
};

const ACCELEROMETER_CONFIG = {
  frequency: 60,
  windowSize: 10
};

// Parâmetros otimizados para detecção de passos
const STEP_DETECTION_PARAMS = {
  magnitudeThreshold: 0.7,
  averageThreshold: 0.35,
  minStepInterval: 180,
  peakThreshold: 0.55
};

const loadStoredSteps = () => {
  const today = new Date().toISOString().split('T')[0];
  const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  const storedSteps = Number(localStorage.getItem(STORAGE_KEYS.STEPS) || '0');

  if (lastSync !== today) {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, today);
    localStorage.setItem(STORAGE_KEYS.STEPS, '0');
    return 0;
  }

  return storedSteps;
};

const StepCounter = () => {
  const initialSteps = loadStoredSteps();
  const initialLastStepTime = Number(localStorage.getItem(STORAGE_KEYS.LAST_STEP_TIME) || '0');
  const storedPermission = localStorage.getItem(STORAGE_KEYS.PERMISSION_GRANTED) === 'true';

  const [steps, setSteps] = useState(initialSteps);
  const [goalSteps] = useState(10000);
  const [lastAcceleration, setLastAcceleration] = useState<AccelerationData>({ x: 0, y: 0, z: 0, timestamp: 0 });
  const [permission, setPermission] = useState<PermissionState | null>(storedPermission ? 'granted' : null);
  const { addTransaction } = useWallet();
  const [lastRewardDate, setLastRewardDate] = useState<string | null>(null);
  const [lastStepTime, setLastStepTime] = useState(initialLastStepTime);
  const [accelerationBuffer, setAccelerationBuffer] = useState<number[]>([]);
  const [peakDetected, setPeakDetected] = useState(false);
  const [deviceMotionActive, setDeviceMotionActive] = useState(false);
  const [sensorActive, setSensorActive] = useState(false);

  const movingAverageFilter = (buffer: number[], windowSize: number = ACCELEROMETER_CONFIG.windowSize): number => {
    if (buffer.length === 0) return 0;
    const window = buffer.slice(-windowSize);
    const sum = window.reduce((a, b) => a + b, 0);
    return sum / window.length;
  };

  const calculateMagnitude = (acc: AccelerationData): number => {
    return Math.sqrt(acc.x * acc.x + acc.y * acc.y * 2 + acc.z * acc.z);
  };

  const detectStep = (acceleration: AccelerationData) => {
    const now = Date.now();
    const magnitude = calculateMagnitude(acceleration);
    
    setAccelerationBuffer(prev => {
      const newBuffer = [...prev, magnitude];
      return newBuffer.slice(-ACCELEROMETER_CONFIG.windowSize);
    });

    const avgMagnitude = movingAverageFilter(accelerationBuffer);
    
    const verticalChange = Math.abs(acceleration.y - lastAcceleration.y);
    
    const timeSinceLastStep = now - lastStepTime;

    if (magnitude > STEP_DETECTION_PARAMS.peakThreshold && 
        !peakDetected && 
        timeSinceLastStep > STEP_DETECTION_PARAMS.minStepInterval) {
      setPeakDetected(true);
      
      if ((verticalChange > STEP_DETECTION_PARAMS.magnitudeThreshold * 0.8 || 
           magnitude > STEP_DETECTION_PARAMS.magnitudeThreshold * 1.2) && 
          avgMagnitude > STEP_DETECTION_PARAMS.averageThreshold * 0.9) {
        const newSteps = steps + 1;
        setSteps(newSteps);
        setLastStepTime(now);
        localStorage.setItem(STORAGE_KEYS.STEPS, newSteps.toString());
        localStorage.setItem(STORAGE_KEYS.LAST_STEP_TIME, now.toString());
      }
    } else if (magnitude < STEP_DETECTION_PARAMS.peakThreshold / 1.8) {
      setPeakDetected(false);
    }
    
    setLastAcceleration({
      ...acceleration,
      timestamp: now
    });
  };

  useEffect(() => {
    let sensor: any = null;

    const startAccelerometer = async () => {
      if (permission !== 'granted') return;

      try {
        // Primeiro, tentamos usar DeviceMotionEvent
        const useDeviceMotion = async () => {
          if (typeof DeviceMotionEvent !== 'undefined') {
            try {
              // Em iOS, precisamos solicitar permissão
              if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
                const permissionResult = await (DeviceMotionEvent as any).requestPermission();
                if (permissionResult !== 'granted') {
                  toast.error('Permissão de movimento negada');
                  return false;
                }
              }
              
              // Adicionamos o listener com uma frequência mais alta
              const deviceMotionHandler = (event: DeviceMotionEvent) => {
                if (event.accelerationIncludingGravity) {
                  detectStep({
                    x: event.accelerationIncludingGravity.x || 0,
                    y: event.accelerationIncludingGravity.y || 0,
                    z: event.accelerationIncludingGravity.z || 0,
                    timestamp: Date.now()
                  });
                }
              };
              
              window.addEventListener('devicemotion', deviceMotionHandler, { passive: true });
              setDeviceMotionActive(true);
              console.log('DeviceMotion iniciado com sucesso');
              return true;
            } catch (error) {
              console.error('Erro ao iniciar DeviceMotion:', error);
              return false;
            }
          }
          return false;
        };

        // Depois, tentamos usar a Accelerometer API
        const useAccelerometerAPI = async () => {
          if (typeof window !== 'undefined' && 'Accelerometer' in window) {
            try {
              const AccelerometerClass = (window as any).Accelerometer;
              sensor = new AccelerometerClass({ 
                frequency: ACCELEROMETER_CONFIG.frequency 
              });
              
              let lastProcessTime = 0;
              const processInterval = 1000 / ACCELEROMETER_CONFIG.frequency;

              sensor.addEventListener('reading', () => {
                const now = Date.now();
                if (now - lastProcessTime >= processInterval) {
                  detectStep({
                    x: sensor.x,
                    y: sensor.y,
                    z: sensor.z,
                    timestamp: now
                  });
                  lastProcessTime = now;
                }
              });

              sensor.addEventListener('error', (error: any) => {
                console.error('Erro no acelerômetro:', error);
                sensor = null;
                useDeviceMotion();
              });

              sensor.start();
              setSensorActive(true);
              console.log('Acelerômetro iniciado com sucesso');
              return true;
            } catch (accelerometerError) {
              console.error('Erro ao iniciar Accelerometer API:', accelerometerError);
              return false;
            }
          }
          return false;
        };

        // Testamos ambas as abordagens
        const deviceMotionSuccess = await useDeviceMotion();
        if (!deviceMotionSuccess) {
          const accelerometerSuccess = await useAccelerometerAPI();
          if (!accelerometerSuccess) {
            toast.error('Não foi possível iniciar o contador de passos');
          }
        }
      } catch (error) {
        console.error('Erro ao iniciar sensores de movimento:', error);
        toast.error('Erro ao iniciar o contador de passos');
      }
    };

    startAccelerometer();

    return () => {
      if (sensor) {
        try {
          sensor.stop();
          setSensorActive(false);
          console.log('Acelerômetro parado');
        } catch (error) {
          console.error('Erro ao parar acelerômetro:', error);
        }
      }
      
      if (deviceMotionActive) {
        window.removeEventListener('devicemotion', () => {});
        setDeviceMotionActive(false);
      }
    };
  }, [permission]);

  useEffect(() => {
    if (steps !== initialSteps) {
      localStorage.setItem(STORAGE_KEYS.STEPS, steps.toString());
    }
  }, [steps, initialSteps]);

  useEffect(() => {
    if (lastStepTime !== initialLastStepTime) {
      localStorage.setItem(STORAGE_KEYS.LAST_STEP_TIME, lastStepTime.toString());
    }
  }, [lastStepTime, initialLastStepTime]);

  useEffect(() => {
    const syncOnVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentSteps = loadStoredSteps();
        if (currentSteps !== steps) {
          setSteps(currentSteps);
        }
      }
    };

    document.addEventListener('visibilitychange', syncOnVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', syncOnVisibilityChange);
    };
  }, [steps]);

  useEffect(() => {
    const checkLastReward = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const today = new Date().toISOString().split('T')[0];
        
        const { data } = await supabase
          .from('step_rewards')
          .select('reward_date')
          .eq('user_id', user.id)
          .eq('reward_date', today)
          .maybeSingle();
          
        if (data) {
          setLastRewardDate(today);
        }
      } catch (error) {
        console.error('Erro ao verificar última recompensa:', error);
      }
    };
    
    checkLastReward();
  }, []);

  // Adicionando detecção automática de movimento a cada 500ms via DeviceMotion
  useEffect(() => {
    if (permission === 'granted' && !deviceMotionActive && !sensorActive) {
      const checkDeviceMotion = () => {
        // Se ainda não temos sensores ativos, forçamos uma leitura via DeviceMotion
        window.addEventListener('devicemotion', function handleMotion(event) {
          if (event.accelerationIncludingGravity) {
            detectStep({
              x: event.accelerationIncludingGravity.x || 0,
              y: event.accelerationIncludingGravity.y || 0,
              z: event.accelerationIncludingGravity.z || 0,
              timestamp: Date.now()
            });
          }
          window.removeEventListener('devicemotion', handleMotion);
        }, { once: true });
      };
      
      // Verificamos periodicamente se há movimento
      const motionCheckInterval = setInterval(checkDeviceMotion, 500);
      
      return () => {
        clearInterval(motionCheckInterval);
      };
    }
  }, [permission, deviceMotionActive, sensorActive]);

  const requestPermission = async () => {
    try {
      console.log('Solicitando permissão para o acelerômetro');
      
      if (typeof DeviceMotionEvent !== 'undefined' && 
          typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permissionResult = await (DeviceMotionEvent as any).requestPermission();
        setPermission(permissionResult);
        
        if (permissionResult === 'granted') {
          localStorage.setItem(STORAGE_KEYS.PERMISSION_GRANTED, 'true');
          toast.success('Permissão concedida!');
        } else {
          toast.error('Permissão negada');
        }
        return;
      }
      
      if (navigator.permissions) {
        try {
          const result = await (navigator.permissions as any).query({ 
            name: 'accelerometer' 
          });

          console.log('Resultado da permissão:', result.state);
          setPermission(result.state);
          
          if (result.state === 'granted') {
            localStorage.setItem(STORAGE_KEYS.PERMISSION_GRANTED, 'true');
            toast.success('Permissão concedida!');
          } else {
            toast.error('Permissão negada');
          }
        } catch (error) {
          console.error('Erro ao solicitar permissão via Permissions API:', error);
          setPermission('granted');
          localStorage.setItem(STORAGE_KEYS.PERMISSION_GRANTED, 'true');
          toast.success('Permissão presumida concedida');
        }
      } else {
        console.log('Permissions API não suportada, presumindo permissão');
        setPermission('granted');
        localStorage.setItem(STORAGE_KEYS.PERMISSION_GRANTED, 'true');
        toast.success('Permissão presumida concedida');
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro ao solicitar permissão');
      
      setPermission('granted');
      localStorage.setItem(STORAGE_KEYS.PERMISSION_GRANTED, 'true');
      toast.info('Tentando continuar sem permissão explícita');
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

  const addStepForTesting = () => {
    const newSteps = steps + 1;
    setSteps(newSteps);
    localStorage.setItem(STORAGE_KEYS.STEPS, newSteps.toString());
  };

  return (
    <Card className="bg-gradient-to-br from-primary-50 to-white border-none shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-primary-600">
          <div className="flex items-center gap-2">
            <Footprints className="w-7 h-7" />
            <span className="text-xl">Atividade Diária</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="text-center space-y-2">
            <span className="text-7xl font-bold text-primary-600">
              {steps.toLocaleString()}
            </span>
            <div className="text-base text-muted-foreground">
              / {goalSteps.toLocaleString()} passos
            </div>
          </div>
          
          <Progress 
            value={progress} 
            className="h-3 w-full bg-primary-100"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 text-base text-muted-foreground mb-1">
                <Activity className="w-5 h-5" />
                Calorias
              </div>
              <div className="text-xl font-semibold text-primary-600">
                {calories} kcal
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 text-base text-muted-foreground mb-1">
                <MapPin className="w-5 h-5" />
                Distância
              </div>
              <div className="text-xl font-semibold text-primary-600">
                {distance} km
              </div>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="text-sm text-gray-500 mt-2 text-center">
              <Button 
                onClick={addStepForTesting} 
                size="sm" 
                variant="outline" 
                className="h-7 text-sm"
              >
                +1 (Test)
              </Button>
            </div>
          )}
        </div>

        {permission !== 'granted' && (
          <Button 
            onClick={requestPermission} 
            className="w-full bg-primary hover:bg-primary-600 text-white text-lg py-6"
          >
            Permitir contagem de passos
          </Button>
        )}

        {permission === 'granted' && (
          <Button
            onClick={handleRewardSteps}
            disabled={!canReceiveReward}
            className="w-full bg-primary hover:bg-primary-600 text-white text-lg py-6"
          >
            {lastRewardDate === today
              ? 'Recompensa já recebida hoje'
              : `Resgatar ${REWARDS.STEPS} FITs`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default StepCounter;
