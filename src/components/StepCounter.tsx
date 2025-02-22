
import { useEffect, useState, useCallback } from 'react';
import { Motion } from '@capacitor/motion';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, LineChart, User, Loader } from "lucide-react";
import { toast } from "sonner";

interface StepData {
  steps: number;
  distance: number;
  calories: number;
}

const STEPS_GOAL = 10000;
const STEP_LENGTH = 0.762;
const CALORIES_PER_STEP = 0.04;
const ACCELERATION_THRESHOLD = 10;
const MIN_TIME_BETWEEN_STEPS = 250;
const SENSOR_INIT_TIMEOUT = 3000; // Aumentado para 3 segundos

const StepCounter = () => {
  const [stepData, setStepData] = useState<StepData>({
    steps: 0,
    distance: 0,
    calories: 0
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sensorSupported, setSensorSupported] = useState(true);
  const [accelerometerInitialized, setAccelerometerInitialized] = useState(false);

  const calculateMetrics = useCallback((steps: number) => {
    const distance = (steps * STEP_LENGTH) / 1000;
    const calories = steps * CALORIES_PER_STEP;
    return { steps, distance, calories };
  }, []);

  const startTraditionalAccelerometer = useCallback(async () => {
    if (accelerometerInitialized) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      try {
        if (!('Accelerometer' in window)) {
          console.log("Acelerômetro não suportado pelo navegador.");
          throw new Error('Acelerômetro não suportado pelo navegador');
        }

        console.log("Acelerômetro suportado pelo navegador.");

        // @ts-ignore - TypeScript não reconhece a API de Sensores Genéricos
        const accelerometer = new Accelerometer({ frequency: 60 });
        let initTimeout: NodeJS.Timeout;
        let initialized = false;

        const cleanup = () => {
          if (initTimeout) clearTimeout(initTimeout);
          if (!initialized) {
            resolve(false);
          }
        };

        accelerometer.addEventListener('reading', () => {
          if (!initialized) {
            initialized = true;
            setHasPermission(true);
            setIsInitialized(true);
            setAccelerometerInitialized(true);
            console.log("Acelerômetro iniciado com sucesso via API tradicional");
            toast.success("Acelerômetro iniciado com sucesso!");
            cleanup();
            resolve(true);
          }
        });

        accelerometer.addEventListener('error', (error: Error) => {
          console.error("Erro detalhado no acelerômetro:", {
            name: error.name,
            message: error.message,
            stack: error.stack
          });

          if (!initialized) {
            if (error.name === 'NotAllowedError') {
              toast.error("Permissão para acessar o acelerômetro foi negada. Por favor, habilite a permissão nas configurações do navegador.");
            } else if (error.name === 'NotReadableError') {
              toast.error("Não foi possível acessar o acelerômetro. Verifique se o dispositivo possui esse sensor.");
            } else {
              toast.error(`Erro ao acessar o acelerômetro: ${error.message}`);
            }
            setSensorSupported(false);
            initialized = true;
            cleanup();
            resolve(false);
          }
        });

        initTimeout = setTimeout(() => {
          if (!initialized) {
            console.log("Timeout na inicialização do acelerômetro tradicional");
            cleanup();
            resolve(false);
          }
        }, SENSOR_INIT_TIMEOUT);

        accelerometer.start();

      } catch (error) {
        console.error("Erro ao iniciar acelerômetro tradicional:", error);
        setSensorSupported(false);
        resolve(false);
      }
    });
  }, [accelerometerInitialized]);

  const startCapacitorAccelerometer = useCallback(async () => {
    if (accelerometerInitialized) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      let initTimeout: NodeJS.Timeout;
      let initialized = false;

      const cleanup = () => {
        if (initTimeout) clearTimeout(initTimeout);
        if (!initialized) {
          Motion.removeAllListeners();
          resolve(false);
        }
      };

      const init = async () => {
        try {
          console.log("Tentando iniciar o acelerômetro via Capacitor...");
          await Motion.removeAllListeners();
          
          const listener = await Motion.addListener('accel', (event) => {
            if (!initialized && event && event.acceleration) {
              const { x, y, z } = event.acceleration;
              console.log("Acelerômetro Capacitor funcionando:", { x, y, z });
              
              initialized = true;
              setHasPermission(true);
              setIsInitialized(true);
              setAccelerometerInitialized(true);
              toast.success("Acelerômetro iniciado com sucesso!");
              cleanup();
              resolve(true);
            }
          });

          initTimeout = setTimeout(() => {
            if (!initialized) {
              console.log("Timeout na inicialização do acelerômetro Capacitor");
              cleanup();
              resolve(false);
            }
          }, SENSOR_INIT_TIMEOUT);

        } catch (error) {
          console.error("Erro detalhado ao iniciar acelerômetro via Capacitor:", error);
          setSensorSupported(false);
          cleanup();
          resolve(false);
        }
      };

      init();
    });
  }, [accelerometerInitialized]);

  const requestPermissions = async () => {
    if (isLoading || accelerometerInitialized) {
      return;
    }

    setIsLoading(true);
    console.log("Iniciando solicitação de permissões...");

    try {
      let success = false;

      // Primeiro tenta via API tradicional se disponível
      if ('Accelerometer' in window) {
        console.log("Tentando API tradicional primeiro...");
        success = await startTraditionalAccelerometer();
      }

      // Se falhou ou não está disponível, tenta via Capacitor
      if (!success) {
        console.log("API tradicional falhou ou não disponível, tentando Capacitor...");
        success = await startCapacitorAccelerometer();
      }

      if (!success) {
        console.log("Todas as tentativas de inicialização falharam");
        setSensorSupported(false);
        toast.error("Não foi possível inicializar o acelerômetro após múltiplas tentativas.");
      }

    } catch (error) {
      console.error('Erro detalhado na solicitação de permissões:', error);
      setSensorSupported(false);
      toast.error("Erro inesperado ao acessar o acelerômetro. Verifique se seu dispositivo possui esse sensor.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let lastStepTime = 0;
    let lastMagnitude = 0;
    let steps = 0;
    let listener: any = null;

    const startStepCounting = async () => {
      if (!hasPermission || !isInitialized || listener) return;

      try {
        console.log("Iniciando contagem de passos...");

        listener = await Motion.addListener('accel', (event) => {
          if (!event || !event.acceleration) {
            return;
          }
          
          const { x, y, z } = event.acceleration;
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();

          if (magnitude > ACCELERATION_THRESHOLD && 
              magnitude > lastMagnitude && 
              (now - lastStepTime) > MIN_TIME_BETWEEN_STEPS) {
            
            steps++;
            lastStepTime = now;
            
            const metrics = calculateMetrics(steps);
            setStepData(metrics);

            console.log('Passo detectado!', {
              magnitude,
              acceleration: { x, y, z },
              totalSteps: steps
            });
          }

          lastMagnitude = magnitude;
        });

        console.log('Contador de passos iniciado com sucesso');
        
      } catch (error) {
        console.error('Erro ao iniciar contagem de passos:', error);
      }
    };

    if (hasPermission && isInitialized) {
      startStepCounting();
    }

    return () => {
      if (listener) {
        Motion.removeAllListeners();
        console.log("Listeners removidos na limpeza");
      }
    };
  }, [hasPermission, isInitialized, calculateMetrics]);

  const progress = (stepData.steps / STEPS_GOAL) * 100;

  return (
    <Card className="w-full bg-white shadow-lg">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Atividade Diária</h2>
            <User className="w-8 h-8 text-primary" />
          </div>
          
          {!sensorSupported && (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
              Seu dispositivo não suporta a contagem de passos. 
              Verifique se possui um acelerômetro e se as permissões estão concedidas.
            </div>
          )}
          
          {sensorSupported && !hasPermission && !isInitialized && (
            <div className="space-y-4">
              <button
                onClick={requestPermissions}
                disabled={isLoading || accelerometerInitialized}
                className="w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Verificando sensor...</span>
                  </>
                ) : (
                  "Permitir contagem de passos"
                )}
              </button>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-4xl font-bold text-primary">
                {stepData.steps.toLocaleString()}
              </span>
              <span className="text-gray-500">/ {STEPS_GOAL.toLocaleString()} passos</span>
            </div>
            
            <Progress value={progress} className="h-3" />
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg">
                <Activity className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Calorias</p>
                  <p className="text-lg font-semibold">
                    {Math.round(stepData.calories)} kcal
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg">
                <LineChart className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Distância</p>
                  <p className="text-lg font-semibold">
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
