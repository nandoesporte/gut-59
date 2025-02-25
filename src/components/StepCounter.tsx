import { useEffect, useState, useCallback } from 'react';
import { Motion, MotionEventResult } from '@capacitor/motion';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, LineChart, User, Loader } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Capacitor } from '@capacitor/core';
import { REWARDS } from '@/constants/rewards';
import { useWallet } from "@/hooks/useWallet";

declare global {
  interface DeviceMotionEvent {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  }
  interface DeviceMotionEventConstructor {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  }
}

interface StepData {
  steps: number;
  distance: number;
  calories: number;
}

interface AccelerometerState {
  isInitialized: boolean;
  hasPermission: boolean;
  lastInitTime: number;
}

const STEPS_GOAL = 10000;
const STEP_LENGTH = 0.762; // metros
const CALORIES_PER_STEP = 0.04;
const ACCELERATION_THRESHOLD = 10;
const MIN_TIME_BETWEEN_STEPS = 250; // milissegundos
const STORAGE_KEY = 'stepCounter';
const ACCELEROMETER_STATE_KEY = 'accelerometerState';
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 1000;

const StepCounter = () => {
  const { addTransaction } = useWallet();
  const [stepData, setStepData] = useState<StepData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      steps: 0,
      distance: 0,
      calories: 0
    };
  });

  const [accelerometerState, setAccelerometerState] = useState<AccelerometerState>(() => {
    const saved = localStorage.getItem(ACCELEROMETER_STATE_KEY);
    return saved ? JSON.parse(saved) : {
      isInitialized: false,
      hasPermission: false,
      lastInitTime: 0
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [sensorSupported, setSensorSupported] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    localStorage.setItem(ACCELEROMETER_STATE_KEY, JSON.stringify(accelerometerState));
  }, [accelerometerState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stepData));
  }, [stepData]);

  const calculateMetrics = useCallback((steps: number) => {
    const distance = (steps * STEP_LENGTH) / 1000;
    const calories = steps * CALORIES_PER_STEP;
    return { steps, distance, calories };
  }, []);

  const startAccelerometer = useCallback(async (isReconnecting = false) => {
    if (isLoading) return false;

    try {
      console.log(isReconnecting ? "Tentando reconectar..." : "Iniciando acelerômetro...");

      const platform = Capacitor.getPlatform();
      console.log("Plataforma:", platform);

      if (platform === 'web') {
        if (!window.DeviceMotionEvent) {
          console.log("DeviceMotionEvent não suportado");
          setSensorSupported(false);
          toast.error("Seu dispositivo não suporta a detecção de movimento.");
          return false;
        }
        
        try {
          if (typeof DeviceMotionEvent.requestPermission === 'function') {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission !== 'granted') {
              toast.error("Permissão para o acelerômetro negada.");
              return false;
            }
          }
        } catch (error) {
          console.error("Erro ao solicitar permissão:", error);
          return false;
        }
      }

      await Motion.removeAllListeners();

      return new Promise<boolean>((resolve) => {
        let initialized = false;
        let timeoutId: number;

        const initializeListener = Motion.addListener('accel', (event: MotionEventResult) => {
          if (!initialized && event?.acceleration) {
            const { x, y, z } = event.acceleration;
            console.log("Dados do acelerômetro:", { x, y, z });

            initialized = true;
            clearTimeout(timeoutId);

            setAccelerometerState(prev => ({
              isInitialized: true,
              hasPermission: true,
              lastInitTime: Date.now()
            }));

            if (!isReconnecting) {
              toast.success("Acelerômetro conectado com sucesso!");
            }

            resolve(true);
          }
        });

        timeoutId = setTimeout(async () => {
          if (!initialized) {
            console.log('Timeout na inicialização do acelerômetro');
            await Motion.removeAllListeners();
            resolve(false);
          }
        }, 5000) as unknown as number;
      });

    } catch (error) {
      console.error("Erro ao iniciar acelerômetro:", error);
      toast.error("Erro ao inicializar o acelerômetro. Verifique as permissões do dispositivo.");
      return false;
    }
  }, [isLoading]);

  const requestPermissions = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setSensorSupported(true);

    try {
      const success = await startAccelerometer();

      if (!success) {
        setSensorSupported(false);
        toast.error("Não foi possível inicializar o acelerômetro. Verifique as permissões e tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao solicitar permissões:", error);
      setSensorSupported(false);
      toast.error("Erro ao acessar o acelerômetro. Verifique as permissões do dispositivo.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const reconnect = async () => {
      if (accelerometerState.isInitialized && 
          reconnectAttempts < MAX_RECONNECT_ATTEMPTS && 
          !accelerometerState.hasPermission) {
        
        console.log(`Tentativa de reconexão ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}`);
        
        setIsLoading(true);
        const success = await startAccelerometer(true);
        setIsLoading(false);

        if (!success) {
          setReconnectAttempts(prev => prev + 1);
          setTimeout(reconnect, RECONNECT_DELAY);
        } else {
          setReconnectAttempts(0);
          console.log("Reconexão bem-sucedida");
        }
      }
    };

    reconnect();
  }, [accelerometerState.isInitialized, accelerometerState.hasPermission, reconnectAttempts, startAccelerometer]);

  useEffect(() => {
    if (!accelerometerState.hasPermission || !accelerometerState.isInitialized) return;

    let lastStepTime = Date.now();
    let lastMagnitude = 0;
    let smoothedMagnitude = 0;
    let lastRewardedStepCount = 0;
    const alpha = 0.8;
    let steps = stepData.steps;

    const startStepCounting = async () => {
      try {
        console.log("Iniciando contagem de passos...");

        await Motion.removeAllListeners();
        
        await Motion.addListener('accel', (event) => {
          if (!event?.acceleration) return;
          
          const { x, y, z } = event.acceleration;
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          
          smoothedMagnitude = alpha * smoothedMagnitude + (1 - alpha) * magnitude;
          
          const now = Date.now();

          if (smoothedMagnitude > ACCELERATION_THRESHOLD && 
              smoothedMagnitude > lastMagnitude && 
              (now - lastStepTime) > MIN_TIME_BETWEEN_STEPS) {
            steps++;
            lastStepTime = now;
            
            if (Math.floor(steps / REWARDS.STEPS_THRESHOLD) > Math.floor(lastRewardedStepCount / REWARDS.STEPS_THRESHOLD)) {
              addTransaction({
                amount: REWARDS.STEPS_GOAL,
                type: 'steps',
                description: `${REWARDS.STEPS_THRESHOLD} passos completados`
              });
              toast.success(`Parabéns! Você completou ${REWARDS.STEPS_THRESHOLD} passos! +${REWARDS.STEPS_GOAL} FITs`);
              lastRewardedStepCount = steps;
            }
            
            setStepData(calculateMetrics(steps));
          }

          lastMagnitude = smoothedMagnitude;
        });

      } catch (error) {
        console.error('Erro ao iniciar contagem:', error);
        setSensorSupported(false);
      }
    };

    startStepCounting();

    return () => {
      Motion.removeAllListeners();
      console.log("Listeners removidos");
    };
  }, [accelerometerState.hasPermission, accelerometerState.isInitialized, calculateMetrics, stepData.steps]);

  const progress = (stepData.steps / STEPS_GOAL) * 100;

  return (
    <Card className="w-full bg-card shadow-lg">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-card-foreground">Atividade Diária</h2>
            <User className="w-8 h-8 text-primary" />
          </div>
          
          {!sensorSupported && (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
              <p>Seu dispositivo não suporta ou não tem permissão para a contagem de passos.</p>
              <Button 
                onClick={() => {
                  setSensorSupported(true);
                  setReconnectAttempts(0);
                  requestPermissions();
                }}
                className="mt-4 w-full"
                variant="secondary"
              >
                Tentar Novamente
              </Button>
            </div>
          )}
          
          {sensorSupported && !accelerometerState.hasPermission && !accelerometerState.isInitialized && (
            <div className="space-y-4">
              <Button
                onClick={requestPermissions}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    {reconnectAttempts > 0 ? "Reconectando..." : "Verificando sensor..."}
                  </>
                ) : (
                  "Permitir contagem de passos"
                )}
              </Button>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-4xl font-bold text-primary">
                {stepData.steps.toLocaleString()}
              </span>
              <span className="text-muted-foreground">/ {STEPS_GOAL.toLocaleString()} passos</span>
            </div>
            
            <Progress value={progress} className="h-3" />
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center space-x-3 bg-muted p-4 rounded-lg">
                <Activity className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Calorias</p>
                  <p className="text-lg font-semibold text-card-foreground">
                    {Math.round(stepData.calories)} kcal
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 bg-muted p-4 rounded-lg">
                <LineChart className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Distância</p>
                  <p className="text-lg font-semibold text-card-foreground">
                    {stepData.distance.toFixed(2)} km
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepCounter;
