
import { useCallback } from 'react';
import { Motion } from '@capacitor/motion';
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";

declare global {
  interface Window {
    DeviceMotionEvent: DeviceMotionEventConstructor & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
  }
  
  interface DeviceMotionEventConstructor {
    new(type: string, eventInitDict?: DeviceMotionEventInit): DeviceMotionEvent;
    prototype: DeviceMotionEvent;
  }
}

interface UseAccelerometerPermissionProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setSensorSupported: (supported: boolean) => void;
  setAccelerometerState: (state: any) => void;
}

export const useAccelerometerPermission = ({
  isLoading,
  setIsLoading,
  setSensorSupported,
  setAccelerometerState
}: UseAccelerometerPermissionProps) => {
  
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
          if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
            const permission = await window.DeviceMotionEvent.requestPermission();
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

        const initializeListener = Motion.addListener('accel', (event) => {
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
  }, [isLoading, setAccelerometerState, setSensorSupported]);

  const requestPermissions = useCallback(async () => {
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
  }, [isLoading, setIsLoading, setSensorSupported, startAccelerometer]);

  return {
    requestPermissions,
    startAccelerometer
  };
};
