
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, LineChart, User, Loader } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REWARDS } from '@/constants/rewards';
import { useWallet } from "@/hooks/useWallet";

declare global {
  interface Window {
    Accelerometer?: {
      new(options: { frequency: number }): Accelerometer;
    };
    Pedometer?: {
      new(options: { frequency: number }): Pedometer;
    };
  }
}

interface Accelerometer extends EventTarget {
  x: number;
  y: number;
  z: number;
  start(): void;
  stop(): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface Pedometer extends EventTarget {
  steps: number;
  start(): void;
  stop(): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface StepData {
  steps: number;
  distance: number;
  calories: number;
}

interface SensorState {
  isInitialized: boolean;
  hasPermission: boolean;
  lastInitTime: number;
  sensor: Accelerometer | Pedometer | null;
}

const STEPS_GOAL = 10000;
const STEP_LENGTH = 0.762; // metros
const CALORIES_PER_STEP = 0.04;
const ACCELERATION_THRESHOLD = 1.5;
const MIN_TIME_BETWEEN_STEPS = 250; // milissegundos
const STORAGE_KEY = 'stepCounter';
const SENSOR_STATE_KEY = 'sensorState';

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

  const [sensorState, setSensorState] = useState<SensorState>(() => {
    const saved = localStorage.getItem(SENSOR_STATE_KEY);
    return saved ? JSON.parse(saved) : {
      isInitialized: false,
      hasPermission: false,
      lastInitTime: 0,
      sensor: null
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [sensorSupported, setSensorSupported] = useState(true);
  const [lastAcceleration, setLastAcceleration] = useState<{ x: number, y: number, z: number } | null>(null);
  const [lastStepTime, setLastStepTime] = useState(Date.now());

  useEffect(() => {
    localStorage.setItem(SENSOR_STATE_KEY, JSON.stringify(sensorState));
  }, [sensorState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stepData));
  }, [stepData]);

  const calculateMetrics = useCallback((steps: number) => {
    const distance = (steps * STEP_LENGTH) / 1000;
    const calories = steps * CALORIES_PER_STEP;
    return { steps, distance, calories };
  }, []);

  const handleStep = useCallback(() => {
    const now = Date.now();
    if (now - lastStepTime > MIN_TIME_BETWEEN_STEPS) {
      setStepData(prev => {
        const newSteps = prev.steps + 1;
        const metrics = calculateMetrics(newSteps);

        // Verificar se atingiu o limiar de passos para recompensa
        if (newSteps % REWARDS.STEPS_THRESHOLD === 0) {
          addTransaction({
            amount: REWARDS.STEPS_GOAL,
            type: 'steps',
            description: `${REWARDS.STEPS_THRESHOLD} passos completados`
          });
          toast.success(`Parabéns! Você completou ${REWARDS.STEPS_THRESHOLD} passos! +${REWARDS.STEPS_GOAL} FITs`);
        }

        return metrics;
      });
      setLastStepTime(now);
    }
  }, [lastStepTime, addTransaction, calculateMetrics]);

  const startSensors = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if ('Pedometer' in window) {
        console.log("Usando sensor de pedômetro");
        const pedometer = new window.Pedometer!({ frequency: 1 });
        
        pedometer.addEventListener('reading', () => {
          const newSteps = pedometer.steps;
          setStepData(calculateMetrics(newSteps));
        });

        pedometer.start();
        setSensorState(prev => ({
          ...prev,
          isInitialized: true,
          hasPermission: true,
          sensor: pedometer
        }));
        toast.success("Pedômetro iniciado com sucesso!");
      } 
      else if ('Accelerometer' in window) {
        console.log("Usando acelerômetro");
        const accelerometer = new window.Accelerometer!({ frequency: 60 });

        accelerometer.addEventListener('reading', () => {
          const { x, y, z } = accelerometer;

          if (lastAcceleration) {
            const deltaX = Math.abs(x - lastAcceleration.x);
            const deltaY = Math.abs(y - lastAcceleration.y);
            const deltaZ = Math.abs(z - lastAcceleration.z);

            if (deltaX + deltaY + deltaZ > ACCELERATION_THRESHOLD) {
              handleStep();
            }
          }

          setLastAcceleration({ x, y, z });
        });

        accelerometer.start();
        setSensorState(prev => ({
          ...prev,
          isInitialized: true,
          hasPermission: true,
          sensor: accelerometer
        }));
        toast.success("Acelerômetro iniciado com sucesso!");
      } else {
        console.log("Nenhum sensor suportado");
        setSensorSupported(false);
        toast.error("Seu dispositivo não suporta a detecção de movimento.");
      }
    } catch (error) {
      console.error("Erro ao iniciar sensores:", error);
      setSensorSupported(false);
      toast.error("Erro ao acessar os sensores. Verifique as permissões do dispositivo.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, lastAcceleration, handleStep, calculateMetrics]);

  useEffect(() => {
    return () => {
      if (sensorState.sensor) {
        sensorState.sensor.stop();
      }
    };
  }, [sensorState.sensor]);

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
                  startSensors();
                }}
                className="mt-4 w-full"
                variant="secondary"
              >
                Tentar Novamente
              </Button>
            </div>
          )}
          
          {sensorSupported && !sensorState.isInitialized && (
            <div className="space-y-4">
              <Button
                onClick={startSensors}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Iniciando sensores...
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
