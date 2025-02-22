
import { useEffect, useState } from 'react';
import { Motion } from '@capacitor/motion';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, LineChart, User } from "lucide-react";
import { toast } from "sonner";

interface StepData {
  steps: number;
  distance: number;
  calories: number;
}

const STEPS_GOAL = 10000;
const STEP_LENGTH = 0.762; // metros (média)
const CALORIES_PER_STEP = 0.04;
const ACCELERATION_THRESHOLD = 10;
const MIN_TIME_BETWEEN_STEPS = 250; // Tempo mínimo entre passos em ms

const StepCounter = () => {
  const [stepData, setStepData] = useState<StepData>({
    steps: 0,
    distance: 0,
    calories: 0
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  const calculateMetrics = (steps: number) => {
    const distance = (steps * STEP_LENGTH) / 1000; // km
    const calories = steps * CALORIES_PER_STEP;
    return { steps, distance, calories };
  };

  const requestPermissions = async () => {
    if (permissionRequested) return false;
    
    setPermissionRequested(true);
    
    try {
      let isAvailable = false;
      
      // Test if accelerometer is available
      await Motion.addListener('accel', () => {
        isAvailable = true;
        console.log('Accelerometer is available');
      });

      // Wait a bit to check if the accelerometer callback was triggered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isAvailable) {
        setHasPermission(true);
        toast.success("Permissão concedida para contagem de passos");
        return true;
      } else {
        toast.error("Seu dispositivo não suporta contagem de passos");
        return false;
      }
    } catch (error) {
      console.error('Erro ao acessar sensores de movimento:', error);
      toast.error("Seu dispositivo não suporta contagem de passos");
      return false;
    }
  };

  useEffect(() => {
    let lastStepTime = 0;
    let lastMagnitude = 0;
    let steps = 0;
    let isInitialized = false;
    let listener: any = null;

    const startStepCounting = async () => {
      try {
        if (!hasPermission && !permissionRequested) {
          const hasPermissions = await requestPermissions();
          if (!hasPermissions) return;
        }

        // Se já temos um listener ativo, não criar outro
        if (listener) return;

        // Configurar o listener do acelerômetro
        listener = await Motion.addListener('accel', (event) => {
          const { x, y, z } = event.acceleration;
          
          // Ignora leituras iniciais para estabilização
          if (!isInitialized) {
            isInitialized = true;
            return;
          }

          // Calcula a magnitude da aceleração
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();

          // Detecta pico de aceleração como passo
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

        console.log('Contador de passos iniciado');
        
      } catch (error) {
        console.error('Erro ao acessar sensores de movimento:', error);
        toast.error("Erro ao iniciar contador de passos");
      }
    };

    startStepCounting();

    // Cleanup function
    return () => {
      if (listener) {
        Motion.removeAllListeners();
      }
    };
  }, [hasPermission, permissionRequested]);

  const progress = (stepData.steps / STEPS_GOAL) * 100;

  return (
    <Card className="w-full bg-white shadow-lg">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Atividade Diária</h2>
            <User className="w-8 h-8 text-primary" />
          </div>
          
          {!hasPermission && !permissionRequested && (
            <button
              onClick={requestPermissions}
              className="w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Permitir contagem de passos
            </button>
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
