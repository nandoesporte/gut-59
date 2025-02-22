
import { useEffect, useState } from 'react';
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

  const calculateMetrics = (steps: number) => {
    const distance = (steps * STEP_LENGTH) / 1000;
    const calories = steps * CALORIES_PER_STEP;
    return { steps, distance, calories };
  };

  const startTraditionalAccelerometer = async () => {
    try {
      if (!('Accelerometer' in window)) {
        console.log("Acelerômetro não suportado pelo navegador.");
        throw new Error('Acelerômetro não suportado pelo navegador');
      }

      console.log("Acelerômetro suportado pelo navegador.");

      // @ts-ignore - TypeScript não reconhece a API de Sensores Genéricos
      const accelerometer = new Accelerometer({ frequency: 60 });

      accelerometer.addEventListener('reading', () => {
        console.log(`Aceleração X: ${accelerometer.x}`);
        console.log(`Aceleração Y: ${accelerometer.y}`);
        console.log(`Aceleração Z: ${accelerometer.z}`);
        setHasPermission(true);
        setIsInitialized(true);
        toast.success("Acelerômetro iniciado com sucesso!");
      });

      accelerometer.addEventListener('error', (error: Error) => {
        console.error("Erro no acelerômetro:", error);
        if (error.name === 'NotAllowedError') {
          toast.error("Permissão para acessar o acelerômetro foi negada. Por favor, habilite a permissão nas configurações do navegador.");
        } else if (error.name === 'NotReadableError') {
          toast.error("Não foi possível acessar o acelerômetro. Verifique se o dispositivo possui esse sensor.");
        }
        setSensorSupported(false);
      });

      accelerometer.start();
      return true;
    } catch (error) {
      console.error("Erro ao iniciar acelerômetro tradicional:", error);
      setSensorSupported(false);
      return false;
    }
  };

  const startCapacitorAccelerometer = async () => {
    try {
      console.log("Tentando iniciar o acelerômetro via Capacitor...");

      await Motion.removeAllListeners();
      console.log("Listeners anteriores removidos");

      const listener = await Motion.addListener('accel', (event) => {
        if (event && event.acceleration) {
          const { x, y, z } = event.acceleration;
          console.log("Acelerômetro funcionando:", { x, y, z });
          
          setHasPermission(true);
          setIsInitialized(true);
          toast.success("Acelerômetro iniciado com sucesso!");
        }
      });

      return true;
    } catch (error) {
      console.error("Erro ao iniciar acelerômetro via Capacitor:", error);
      setSensorSupported(false);
      return false;
    }
  };

  const requestPermissions = async () => {
    setIsLoading(true);

    try {
      // Primeiro verifica se o navegador suporta a API de Sensores Genéricos
      if (!('Accelerometer' in window)) {
        console.log("API de Sensores Genéricos não suportada, tentando Capacitor...");
        const capacitorSuccess = await startCapacitorAccelerometer();
        
        if (!capacitorSuccess) {
          setSensorSupported(false);
          toast.error("Seu dispositivo não suporta acelerômetro.");
          return;
        }
      } else {
        // Se suportar, tenta usar a API de Sensores Genéricos
        const traditionalSuccess = await startTraditionalAccelerometer();
        
        if (!traditionalSuccess) {
          console.log("API de Sensores Genéricos falhou, tentando Capacitor...");
          const capacitorSuccess = await startCapacitorAccelerometer();
          
          if (!capacitorSuccess) {
            setSensorSupported(false);
            toast.error("Não foi possível acessar o acelerômetro.");
            return;
          }
        }
      }

      // Aguarda um momento para ver se recebemos dados
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!hasPermission) {
        console.log("Nenhuma leitura recebida, sensor pode não estar disponível");
        setSensorSupported(false);
        toast.error("Não foi possível receber dados do acelerômetro.");
      }

    } catch (error) {
      console.error('Erro ao iniciar acelerômetro:', error);
      setSensorSupported(false);
      toast.error("Erro ao acessar o acelerômetro. Verifique se seu dispositivo possui esse sensor.");
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
      if (!hasPermission || !isInitialized) return;

      try {
        console.log("Iniciando contagem de passos...");
        
        if (listener) {
          console.log("Listener já existe, ignorando...");
          return;
        }

        listener = await Motion.addListener('accel', (event) => {
          if (!event || !event.acceleration) {
            console.log("Evento inválido recebido");
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
  }, [hasPermission, isInitialized]);

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
                disabled={isLoading}
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
