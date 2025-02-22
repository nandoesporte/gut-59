
import { useEffect, useState, useCallback } from 'react';
import { Motion } from '@capacitor/motion';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, LineChart, User, Loader } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
const STORAGE_KEY = 'stepCounter';

const StepCounter = () => {
  const [stepData, setStepData] = useState<StepData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      steps: 0,
      distance: 0,
      calories: 0
    };
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sensorSupported, setSensorSupported] = useState(true);
  const [accelerometerInitialized, setAccelerometerInitialized] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stepData));
  }, [stepData]);

  const calculateMetrics = useCallback((steps: number) => {
    const distance = (steps * STEP_LENGTH) / 1000;
    const calories = steps * CALORIES_PER_STEP;
    return { steps, distance, calories };
  }, []);

  const checkAccelerometerAvailability = useCallback(async () => {
    try {
      // Primeiro, tenta obter uma leitura inicial do acelerômetro
      const initialReading = await new Promise((resolve) => {
        let hasReading = false;
        
        Motion.addListener('accel', (event) => {
          if (!hasReading && event?.acceleration) {
            hasReading = true;
            Motion.removeAllListeners();
            resolve(true);
          }
        });

        // Timeout após 2 segundos
        setTimeout(() => {
          if (!hasReading) {
            Motion.removeAllListeners();
            resolve(false);
          }
        }, 2000);
      });

      return initialReading;
    } catch (error) {
      console.error('Erro ao verificar disponibilidade do acelerômetro:', error);
      return false;
    }
  }, []);

  const startAccelerometer = useCallback(async () => {
    if (accelerometerInitialized) return true;

    try {
      console.log("Tentando iniciar acelerômetro...");
      
      // Remove listeners antigos
      await Motion.removeAllListeners();
      
      // Configura novo listener
      const initPromise = new Promise<boolean>((resolve) => {
        let initialized = false;
        
        Motion.addListener('accel', (event) => {
          if (!initialized && event?.acceleration) {
            const { x, y, z } = event.acceleration;
            console.log("Dados do acelerômetro:", { x, y, z });
            
            initialized = true;
            setHasPermission(true);
            setIsInitialized(true);
            setAccelerometerInitialized(true);
            toast.success("Acelerômetro iniciado com sucesso!");
            resolve(true);
          }
        });

        // Timeout após 3 segundos
        setTimeout(() => {
          if (!initialized) {
            Motion.removeAllListeners();
            resolve(false);
          }
        }, 3000);
      });

      const result = await initPromise;
      
      if (!result) {
        console.log("Não foi possível inicializar o acelerômetro");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao iniciar acelerômetro:", error);
      return false;
    }
  }, [accelerometerInitialized]);

  const requestPermissions = async () => {
    if (isLoading || accelerometerInitialized) return;

    setIsLoading(true);
    setSensorSupported(true);

    try {
      console.log("Verificando disponibilidade do acelerômetro...");
      const isAvailable = await checkAccelerometerAvailability();

      if (!isAvailable) {
        console.log("Acelerômetro não disponível no dispositivo");
        setSensorSupported(false);
        toast.error("Acelerômetro não encontrado no dispositivo. Verifique se seu dispositivo possui sensor de movimento.");
        return;
      }

      console.log("Acelerômetro disponível, iniciando...");
      const success = await startAccelerometer();

      if (!success) {
        setSensorSupported(false);
        toast.error("Não foi possível inicializar o acelerômetro. Por favor, tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao solicitar permissões:", error);
      setSensorSupported(false);
      toast.error("Erro ao acessar o acelerômetro.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!accelerometerInitialized && !isLoading) {
      requestPermissions();
    }
  }, [accelerometerInitialized, isLoading]);

  useEffect(() => {
    if (!hasPermission || !isInitialized) return;

    let lastStepTime = Date.now();
    let lastMagnitude = 0;
    let steps = stepData.steps;

    const startStepCounting = async () => {
      try {
        console.log("Iniciando contagem de passos...");

        await Motion.removeAllListeners();
        
        await Motion.addListener('accel', (event) => {
          if (!event?.acceleration) return;
          
          const { x, y, z } = event.acceleration;
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();

          if (magnitude > ACCELERATION_THRESHOLD && 
              magnitude > lastMagnitude && 
              (now - lastStepTime) > MIN_TIME_BETWEEN_STEPS) {
            steps++;
            lastStepTime = now;
            setStepData(calculateMetrics(steps));
            console.log('Passo detectado:', { magnitude, totalSteps: steps });
          }

          lastMagnitude = magnitude;
        });

        console.log('Sistema de contagem de passos iniciado');
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
  }, [hasPermission, isInitialized, calculateMetrics, stepData.steps]);

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
              <p>Seu dispositivo não suporta a contagem de passos.</p>
              <p className="mt-2">Para usar esta função:</p>
              <ul className="list-disc ml-6 mt-1">
                <li>Use um dispositivo móvel com acelerômetro</li>
                <li>Certifique-se que as permissões de movimento estejam ativadas</li>
                <li>Execute o aplicativo no modo nativo (não no navegador)</li>
              </ul>
              <Button 
                onClick={() => {
                  setSensorSupported(true);
                  requestPermissions();
                }}
                className="mt-4 w-full"
                variant="secondary"
              >
                Tentar Novamente
              </Button>
            </div>
          )}
          
          {sensorSupported && !hasPermission && !isInitialized && (
            <div className="space-y-4">
              <Button
                onClick={requestPermissions}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Verificando sensor...
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
