import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Footprints, Activity, MapPin, Settings } from 'lucide-react';
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

interface CalibrationData {
  magnitude: number;
  avgMagnitude: number;
  timestamp: number;
}

const STORAGE_KEYS = {
  STEPS: 'stepCounter_steps',
  LAST_SYNC: 'stepCounter_lastSync',
  PARAMETERS: 'stepCounter_parameters',
  LAST_STEP_TIME: 'stepCounter_lastStepTime'
};

const ACCELEROMETER_CONFIG = {
  frequency: 60,
  windowSize: 5
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
  const initialParameters = JSON.parse(localStorage.getItem(STORAGE_KEYS.PARAMETERS) || 'null') || {
    magnitudeThreshold: 1.0, // Reduced from 1.2
    averageThreshold: 0.6,   // Reduced from 0.8
    minStepInterval: 200,    // Reduced from 250
    peakThreshold: 0.8       // Reduced from 1.0
  };

  const [steps, setSteps] = useState(initialSteps);
  const [goalSteps] = useState(10000);
  const [lastAcceleration, setLastAcceleration] = useState<AccelerationData>({ x: 0, y: 0, z: 0, timestamp: 0 });
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const { addTransaction } = useWallet();
  const [lastRewardDate, setLastRewardDate] = useState<string | null>(null);
  const [lastStepTime, setLastStepTime] = useState(initialLastStepTime);
  const [accelerationBuffer, setAccelerationBuffer] = useState<number[]>([]);
  const [peakDetected, setPeakDetected] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationTime, setCalibrationTime] = useState(0);
  const calibrationData = useRef<CalibrationData[]>([]);
  const [parameters, setParameters] = useState(initialParameters);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const movingAverageFilter = (buffer: number[], windowSize: number = ACCELEROMETER_CONFIG.windowSize): number => {
    if (buffer.length === 0) return 0;
    const window = buffer.slice(-windowSize);
    const sum = window.reduce((a, b) => a + b, 0);
    return sum / window.length;
  };

  const calculateMagnitude = (acc: AccelerationData): number => {
    return Math.sqrt(acc.x * acc.x + acc.y * acc.y * 2 + acc.z * acc.z);
  };

  const analyzeCalibrationData = () => {
    if (calibrationData.current.length < 10) {
      toast.error('Dados de calibração insuficientes');
      return;
    }

    const magnitudes = calibrationData.current.map(d => d.magnitude);
    const avgMagnitudes = calibrationData.current.map(d => d.avgMagnitude);
    
    const sortedMagnitudes = [...magnitudes].sort((a, b) => b - a);
    const sortedAvgMagnitudes = [...avgMagnitudes].sort((a, b) => b - a);
    
    const topCount = Math.max(Math.floor(magnitudes.length * 0.2), 1);
    const peakMagnitudes = sortedMagnitudes.slice(0, topCount);
    const peakAvgMagnitudes = sortedAvgMagnitudes.slice(0, topCount);
    
    const avgPeakMagnitude = peakMagnitudes.reduce((a, b) => a + b, 0) / peakMagnitudes.length;
    const avgPeakAvgMagnitude = peakAvgMagnitudes.reduce((a, b) => a + b, 0) / peakAvgMagnitudes.length;

    const intervals: number[] = [];
    let lastPeakTime = 0;
    calibrationData.current.forEach(data => {
      if (data.magnitude > avgPeakMagnitude * 0.8) {
        if (lastPeakTime > 0) {
          intervals.push(data.timestamp - lastPeakTime);
        }
        lastPeakTime = data.timestamp;
      }
    });

    const avgInterval = intervals.length > 0 
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
      : 300;

    const newParameters = {
      magnitudeThreshold: avgPeakMagnitude * 0.6, // Reduced from 0.7
      averageThreshold: avgPeakAvgMagnitude * 0.5, // Reduced from 0.6
      minStepInterval: Math.min(Math.max(avgInterval * 0.6, 180), 350),
      peakThreshold: avgPeakMagnitude * 0.5 // Reduced from 0.6
    };

    setParameters(newParameters);
    console.log('Novos parâmetros calculados:', newParameters);
    toast.success('Calibração concluída!');
  };

  const detectStep = (acceleration: AccelerationData) => {
    const now = Date.now();
    const magnitude = calculateMagnitude(acceleration);
    
    if (isCalibrating) {
      setAccelerationBuffer(prev => {
        const newBuffer = [...prev, magnitude];
        return newBuffer.slice(-ACCELEROMETER_CONFIG.windowSize);
      });
      
      const avgMagnitude = movingAverageFilter(accelerationBuffer);
      calibrationData.current.push({
        magnitude,
        avgMagnitude,
        timestamp: now
      });
      
      return;
    }

    setAccelerationBuffer(prev => {
      const newBuffer = [...prev, magnitude];
      return newBuffer.slice(-ACCELEROMETER_CONFIG.windowSize);
    });

    const avgMagnitude = movingAverageFilter(accelerationBuffer);
    
    const verticalChange = Math.abs(acceleration.y - lastAcceleration.y);
    
    const timeSinceLastStep = now - lastStepTime;

    setDebugInfo(`Mag: ${magnitude.toFixed(2)}, Avg: ${avgMagnitude.toFixed(2)}, Vrt: ${verticalChange.toFixed(2)}, T: ${timeSinceLastStep}`);

    if (magnitude > parameters.peakThreshold && 
        !peakDetected && 
        timeSinceLastStep > parameters.minStepInterval) {
      setPeakDetected(true);
      
      if ((verticalChange > parameters.magnitudeThreshold || magnitude > parameters.magnitudeThreshold * 1.5) && 
          avgMagnitude > parameters.averageThreshold) {
        const newSteps = steps + 1;
        setSteps(newSteps);
        setLastStepTime(now);
        localStorage.setItem(STORAGE_KEYS.STEPS, newSteps.toString());
        localStorage.setItem(STORAGE_KEYS.LAST_STEP_TIME, now.toString());
        
        console.log('Passo detectado:', {
          magnitude,
          avgMagnitude,
          verticalChange,
          timeSinceLastStep,
          parameters
        });
      }
    } else if (magnitude < parameters.peakThreshold / 1.5) {
      setPeakDetected(false);
    }
    
    setLastAcceleration({
      ...acceleration,
      timestamp: now
    });
  };

  useEffect(() => {
    let sensor: any = null;
    let calibrationInterval: NodeJS.Timeout | null = null;

    const startAccelerometer = async () => {
      if (permission !== 'granted') return;

      try {
        if (typeof DeviceMotionEvent !== 'undefined' && 
            typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          const permissionResult = await (DeviceMotionEvent as any).requestPermission();
          if (permissionResult !== 'granted') {
            toast.error('Permissão de movimento negada');
            return;
          }
        }

        if ('Accelerometer' in window) {
          sensor = new Accelerometer({ 
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

          sensor.start();
          console.log('Acelerômetro iniciado');
        } else {
          window.addEventListener('devicemotion', (event) => {
            if (event.accelerationIncludingGravity) {
              detectStep({
                x: event.accelerationIncludingGravity.x || 0,
                y: event.accelerationIncludingGravity.y || 0,
                z: event.accelerationIncludingGravity.z || 0,
                timestamp: Date.now()
              });
            }
          });
          console.log('DeviceMotion iniciado como fallback');
        }
      } catch (error) {
        console.error('Erro ao iniciar acelerômetro:', error);
        toast.error('Erro ao iniciar o contador de passos. Tentando DeviceMotion como alternativa...');
        
        try {
          window.addEventListener('devicemotion', (event) => {
            if (event.accelerationIncludingGravity) {
              detectStep({
                x: event.accelerationIncludingGravity.x || 0,
                y: event.accelerationIncludingGravity.y || 0,
                z: event.accelerationIncludingGravity.z || 0,
                timestamp: Date.now()
              });
            }
          });
          console.log('DeviceMotion iniciado como fallback após erro');
        } catch (fallbackError) {
          console.error('Erro ao iniciar DeviceMotion:', fallbackError);
          toast.error('Não foi possível iniciar o contador de passos');
        }
      }
    };

    if (isCalibrating) {
      calibrationData.current = [];
      setCalibrationTime(10);
      calibrationInterval = setInterval(() => {
        setCalibrationTime(prev => {
          if (prev <= 1) {
            setIsCalibrating(false);
            analyzeCalibrationData();
            if (calibrationInterval) clearInterval(calibrationInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

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
      if (calibrationInterval) {
        clearInterval(calibrationInterval);
      }

      window.removeEventListener('devicemotion', () => {});
    };
  }, [permission, isCalibrating]);

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
    localStorage.setItem(STORAGE_KEYS.PARAMETERS, JSON.stringify(parameters));
  }, [parameters]);

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
          .single();
          
        if (data) {
          setLastRewardDate(today);
        }
      } catch (error) {
        console.error('Erro ao verificar última recompensa:', error);
      }
    };
    
    checkLastReward();
  }, []);

  const startCalibration = () => {
    setIsCalibrating(true);
    toast.info('Calibração iniciada! Por favor, caminhe normalmente por 10 segundos.');
  };

  const requestPermission = async () => {
    try {
      console.log('Solicitando permissão para o acelerômetro');
      
      if (typeof DeviceMotionEvent !== 'undefined' && 
          typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permissionResult = await (DeviceMotionEvent as any).requestPermission();
        setPermission(permissionResult);
        
        if (permissionResult === 'granted') {
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
            toast.success('Permissão concedida!');
          } else {
            toast.error('Permissão negada');
          }
        } catch (error) {
          console.error('Erro ao solicitar permissão via Permissions API:', error);
          setPermission('granted');
          toast.success('Permissão presumida concedida');
        }
      } else {
        console.log('Permissions API não suportada, presumindo permissão');
        setPermission('granted');
        toast.success('Permissão presumida concedida');
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro ao solicitar permissão');
      
      setPermission('granted');
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
            <Footprints className="w-6 h-6" />
            Atividade Diária
          </div>
          {permission === 'granted' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={startCalibration}
              disabled={isCalibrating}
              className="text-primary-600"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          {isCalibrating ? (
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold text-primary-600">
                Calibrando... {calibrationTime}s
              </div>
              <div className="text-sm text-muted-foreground">
                Por favor, caminhe normalmente
              </div>
            </div>
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

              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 mb-2 text-center">
                  {debugInfo}
                  <Button 
                    onClick={addStepForTesting} 
                    size="sm" 
                    variant="outline" 
                    className="ml-2 h-6 text-xs"
                  >
                    +1 (Test)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {permission !== 'granted' && (
          <Button 
            onClick={requestPermission} 
            className="w-full bg-primary hover:bg-primary-600 text-white"
          >
            Permitir contagem de passos
          </Button>
        )}

        {permission === 'granted' && (
          <Button
            onClick={handleRewardSteps}
            disabled={!canReceiveReward}
            className="w-full bg-primary hover:bg-primary-600 text-white"
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
