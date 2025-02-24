
import { useState, useCallback, useEffect } from 'react';
import { Motion } from '@capacitor/motion';
import { StepData, AccelerometerState, STEP_CONSTANTS } from '../types';
import { REWARDS } from '@/constants/rewards';
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

export const useStepCounter = () => {
  const { addTransaction, wallet } = useWallet();
  const [stepData, setStepData] = useState<StepData>(() => {
    const saved = localStorage.getItem(STEP_CONSTANTS.STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      steps: 0,
      distance: 0,
      calories: 0
    };
  });

  const [accelerometerState, setAccelerometerState] = useState<AccelerometerState>(() => {
    const saved = localStorage.getItem(STEP_CONSTANTS.ACCELEROMETER_STATE_KEY);
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
    localStorage.setItem(STEP_CONSTANTS.ACCELEROMETER_STATE_KEY, JSON.stringify(accelerometerState));
  }, [accelerometerState]);

  useEffect(() => {
    localStorage.setItem(STEP_CONSTANTS.STORAGE_KEY, JSON.stringify(stepData));
  }, [stepData]);

  const calculateMetrics = useCallback((steps: number) => {
    const distance = (steps * STEP_CONSTANTS.STEP_LENGTH) / 1000;
    const calories = steps * STEP_CONSTANTS.CALORIES_PER_STEP;
    return { steps, distance, calories };
  }, []);

  const startStepCounting = useCallback(async () => {
    if (!accelerometerState.hasPermission || !accelerometerState.isInitialized || !wallet) return;

    let lastStepTime = Date.now();
    let lastMagnitude = 0;
    let smoothedMagnitude = 0;
    let lastRewardedStepCount = 0;
    const alpha = 0.8;
    let steps = stepData.steps;

    try {
      console.log("Iniciando contagem de passos...");
      console.log("Carteira encontrada:", wallet.id);

      await Motion.removeAllListeners();
      
      await Motion.addListener('accel', (event) => {
        if (!event?.acceleration) return;
        
        const { x, y, z } = event.acceleration;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        
        smoothedMagnitude = alpha * smoothedMagnitude + (1 - alpha) * magnitude;
        
        const now = Date.now();

        if (smoothedMagnitude > STEP_CONSTANTS.ACCELERATION_THRESHOLD && 
            smoothedMagnitude > lastMagnitude && 
            (now - lastStepTime) > STEP_CONSTANTS.MIN_TIME_BETWEEN_STEPS) {
          steps++;
          lastStepTime = now;
          
          if (Math.floor(steps / REWARDS.STEPS_THRESHOLD) > Math.floor(lastRewardedStepCount / REWARDS.STEPS_THRESHOLD)) {
            if (wallet) {
              addTransaction({
                amount: REWARDS.STEPS_GOAL,
                type: 'steps',
                description: `${REWARDS.STEPS_THRESHOLD} passos completados`
              });
              toast.success(`Parabéns! Você completou ${REWARDS.STEPS_THRESHOLD} passos! +${REWARDS.STEPS_GOAL} FITs`);
              lastRewardedStepCount = steps;
            } else {
              console.error("Carteira não encontrada ao tentar adicionar recompensa");
            }
          }
          
          setStepData(calculateMetrics(steps));
        }

        lastMagnitude = smoothedMagnitude;
      });

    } catch (error) {
      console.error('Erro ao iniciar contagem:', error);
      setSensorSupported(false);
    }

    return () => {
      Motion.removeAllListeners();
    };
  }, [accelerometerState.hasPermission, accelerometerState.isInitialized, stepData.steps, calculateMetrics, addTransaction, wallet]);

  useEffect(() => {
    startStepCounting();
  }, [startStepCounting]);

  return {
    stepData,
    isLoading,
    sensorSupported,
    accelerometerState,
    reconnectAttempts,
    setReconnectAttempts,
    setAccelerometerState,
    setSensorSupported,
    setIsLoading
  };
};
