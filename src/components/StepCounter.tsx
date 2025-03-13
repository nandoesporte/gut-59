
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Footprints, Activity, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/hooks/useWallet';
import { REWARDS } from '@/constants/rewards';
import { useIsMobile } from '@/hooks/use-mobile';

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
  magnitudeThreshold: 0.65, // Diminuído para maior sensibilidade
  averageThreshold: 0.32,   // Diminuído para maior sensibilidade
  minStepInterval: 150,     // Menor intervalo para detectar passos mais rapidamente
  peakThreshold: 0.5        // Limiar para detectar picos de aceleração
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
  const [isInitializing, setIsInitializing] = useState(false);
  const isMobile = useIsMobile();

  const movingAverageFilter = (buffer: number[], windowSize: number = ACCELEROMETER_CONFIG.windowSize): number => {
    if (buffer.length === 0) return 0;
    const window = buffer.slice(-windowSize);
    const sum = window.reduce((a, b) => a + b, 0);
    return sum / window.length;
  };

  const calculateMagnitude = (acc: AccelerationData): number => {
    return Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
  };

  const detectStep = (acceleration: AccelerationData) => {
    const now = Date.now();
    const magnitude = calculateMagnitude(acceleration);
    
    // Log para depuração durante desenvolvimento
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) { 
      console.log(`Magnitude: ${magnitude.toFixed(2)}`);
    }
    
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
           magnitude > STEP_DETECTION_PARAMS.magnitudeThreshold * 1.1) && 
          avgMagnitude > STEP_DETECTION_PARAMS.averageThreshold * 0.9) {
        const newSteps = steps + 1;
        setSteps(newSteps);
        setLastStepTime(now);
        localStorage.setItem(STORAGE_KEYS.STEPS, newSteps.toString());
        localStorage.setItem(STORAGE_KEYS.LAST_STEP_TIME, now.toString());
        
        // Log para depuração
        if (process.env.NODE_ENV === 'development') {
          console.log(`Passo detectado! Total: ${newSteps}`);
        }
      }
    } else if (magnitude < STEP_DETECTION_PARAMS.peakThreshold / 1.5) {
      setPeakDetected(false);
    }
    
    setLastAcceleration({
      ...acceleration,
      timestamp: now
    });
  };

  const startAccelerometer = async () => {
    console.log('Iniciando acelerômetro com permissão:', permission);
    if (permission !== 'granted') {
      console.log('Permissão não concedida para iniciar acelerômetro');
      return;
    }
    
    if (isInitializing) {
      console.log('Já inicializando sensores, aguarde...');
      return;
    }
    
    setIsInitializing(true);

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
            
            // Removemos listeners anteriores para evitar duplicações
            window.removeEventListener('devicemotion', deviceMotionHandler);
            
            // Adicionamos o listener com uma frequência mais alta
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
      
      // Handler para os eventos de deviceMotion
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

      // Depois, tentamos usar a Accelerometer API
      const useAccelerometerAPI = async () => {
        if (typeof window !== 'undefined' && 'Accelerometer' in window) {
          try {
            const AccelerometerClass = (window as any).Accelerometer;
            const sensor = new AccelerometerClass({ 
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
          console.error('Não foi possível iniciar nenhum sensor de movimento');
          toast.error('Não foi possível iniciar o contador de passos');
          
          // Como último recurso, vamos simular passos para testes
          if (process.env.NODE_ENV === 'development') {
            console.log('Iniciando modo de simulação de passos para desenvolvimento');
            const interval = setInterval(() => {
              detectStep({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                z: Math.random() * 2 - 1,
                timestamp: Date.now()
              });
            }, 1000);
            
            // Limpa o intervalo quando o componente é desmontado
            return () => clearInterval(interval);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao iniciar sensores de movimento:', error);
      toast.error('Erro ao iniciar o contador de passos');
    } finally {
      setIsInitializing(false);
    }
  };

  // Efeito para iniciar sensores quando componente é montado ou permissão concedida
  useEffect(() => {
    if (permission === 'granted') {
      startAccelerometer();
    }
    
    // Também tentamos iniciar automaticamente se o dispositivo permitir
    if (!permission) {
      requestPermission();
    }
    
    return () => {
      // Limpeza ao desmontar o componente
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', () => {
          console.log('Removendo event listener de devicemotion');
        });
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

  // Sincronização quando a página volta a ficar visível
  useEffect(() => {
    const syncOnVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentSteps = loadStoredSteps();
        if (currentSteps !== steps) {
          setSteps(currentSteps);
        }
        
        // Reiniciar sensores se necessário
        if (permission === 'granted' && !deviceMotionActive && !sensorActive) {
          console.log('Reiniciando sensores após visibilidade');
          startAccelerometer();
        }
      }
    };

    document.addEventListener('visibilitychange', syncOnVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', syncOnVisibilityChange);
    };
  }, [steps, permission, deviceMotionActive, sensorActive]);

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

  // Verificação periódica para garantir que sensores estão ativos
  useEffect(() => {
    const checkSensorStatus = () => {
      if (permission === 'granted' && !deviceMotionActive && !sensorActive && !isInitializing) {
        console.log('Sensores não ativos, reiniciando...');
        startAccelerometer();
      }
    };
    
    const interval = setInterval(checkSensorStatus, 3000);
    return () => clearInterval(interval);
  }, [permission, deviceMotionActive, sensorActive, isInitializing]);

  const requestPermission = async () => {
    try {
      console.log('Solicitando permissão para o acelerômetro');
      
      if (isInitializing) {
        console.log('Já inicializando, aguarde...');
        return;
      }
      
      setIsInitializing(true);
      
      let permissionGranted = false;
      
      if (typeof DeviceMotionEvent !== 'undefined' && 
          typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permissionResult = await (DeviceMotionEvent as any).requestPermission();
        permissionGranted = permissionResult === 'granted';
        console.log('Resultado da permissão (iOS):', permissionResult);
      } else if (navigator.permissions) {
        try {
          const result = await (navigator.permissions as any).query({ 
            name: 'accelerometer' 
          });
          
          console.log('Resultado da permissão (Permissions API):', result.state);
          permissionGranted = result.state === 'granted';
        } catch (error) {
          console.error('Erro ao solicitar permissão via Permissions API:', error);
          // Em caso de erro, presumimos que a permissão foi concedida
          permissionGranted = true;
        }
      } else {
        console.log('Permissions API não suportada, presumindo permissão');
        permissionGranted = true;
      }
      
      if (permissionGranted) {
        setPermission('granted');
        localStorage.setItem(STORAGE_KEYS.PERMISSION_GRANTED, 'true');
        toast.success('Contador de passos ativado!');
        
        // Iniciar acelerômetro imediatamente após permissão concedida
        setTimeout(() => {
          startAccelerometer();
        }, 500);
      } else {
        toast.error('Permissão para contador de passos negada');
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      
      // Em caso de erro, presumimos permissão e tentamos continuar
      setPermission('granted');
      localStorage.setItem(STORAGE_KEYS.PERMISSION_GRANTED, 'true');
      toast.info('Permissão para contador de passos presumida');
      
      // Iniciar acelerômetro
      setTimeout(() => {
        startAccelerometer();
      }, 500);
    } finally {
      setIsInitializing(false);
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
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="flex items-center justify-between text-primary-600">
          <div className="flex items-center gap-2">
            <Footprints className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="text-lg sm:text-xl">Atividade Diária</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
        <div>
          <div className="text-center space-y-1 sm:space-y-2 mb-2 sm:mb-4">
            <span className="text-5xl sm:text-7xl font-bold text-primary-600">
              {steps.toLocaleString()}
            </span>
            <div className="text-sm sm:text-base text-muted-foreground">
              / {goalSteps.toLocaleString()} passos
            </div>
          </div>
          
          <Progress 
            value={progress} 
            className="h-2 sm:h-3 w-full bg-primary-100 mb-3 sm:mb-5"
          />

          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base text-muted-foreground mb-0.5 sm:mb-1">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                Calorias
              </div>
              <div className="text-lg sm:text-xl font-semibold text-primary-600">
                {calories} kcal
              </div>
            </div>
            
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base text-muted-foreground mb-0.5 sm:mb-1">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                Distância
              </div>
              <div className="text-lg sm:text-xl font-semibold text-primary-600">
                {distance} km
              </div>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs sm:text-sm text-gray-500 mt-2 text-center">
              <Button 
                onClick={addStepForTesting} 
                size="sm" 
                variant="outline" 
                className="h-6 sm:h-7 text-xs sm:text-sm"
              >
                +1 (Test)
              </Button>
            </div>
          )}
        </div>

        {permission !== 'granted' && (
          <Button 
            onClick={requestPermission} 
            className="w-full bg-primary hover:bg-primary-600 text-white text-base sm:text-lg py-5 sm:py-6"
          >
            Permitir contagem de passos
          </Button>
        )}

        {permission === 'granted' && (
          <Button
            onClick={handleRewardSteps}
            disabled={!canReceiveReward}
            className="w-full bg-primary hover:bg-primary-600 text-white text-base sm:text-lg py-5 sm:py-6"
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
