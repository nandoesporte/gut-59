
import { useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, LineChart, User, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STEP_CONSTANTS } from './types';
import { useStepCounter } from './hooks/useStepCounter';
import { useAccelerometerPermission } from './hooks/useAccelerometerPermission';

const StepCounter = () => {
  const {
    stepData,
    isLoading,
    sensorSupported,
    accelerometerState,
    reconnectAttempts,
    setReconnectAttempts,
    setAccelerometerState,
    setSensorSupported,
    setIsLoading
  } = useStepCounter();

  const { requestPermissions, startAccelerometer } = useAccelerometerPermission({
    isLoading,
    setIsLoading,
    setSensorSupported,
    setAccelerometerState
  });

  useEffect(() => {
    const reconnect = async () => {
      if (accelerometerState.isInitialized && 
          reconnectAttempts < STEP_CONSTANTS.MAX_RECONNECT_ATTEMPTS && 
          !accelerometerState.hasPermission) {
        
        console.log(`Tentativa de reconexão ${reconnectAttempts + 1}/${STEP_CONSTANTS.MAX_RECONNECT_ATTEMPTS}`);
        
        setIsLoading(true);
        const success = await startAccelerometer(true);
        setIsLoading(false);

        if (!success) {
          setReconnectAttempts(prev => prev + 1);
          setTimeout(reconnect, STEP_CONSTANTS.RECONNECT_DELAY);
        } else {
          setReconnectAttempts(0);
          console.log("Reconexão bem-sucedida");
        }
      }
    };

    reconnect();
  }, [accelerometerState.isInitialized, accelerometerState.hasPermission, reconnectAttempts, startAccelerometer, setIsLoading, setReconnectAttempts]);

  const progress = (stepData.steps / STEP_CONSTANTS.STEPS_GOAL) * 100;

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
              <span className="text-muted-foreground">/ {STEP_CONSTANTS.STEPS_GOAL.toLocaleString()} passos</span>
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
