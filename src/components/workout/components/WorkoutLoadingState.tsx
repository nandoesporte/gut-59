
import React, { useState, useEffect } from 'react';
import { Dumbbell, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkoutLoadingStateProps {
  message?: string;
  onRetry?: () => void;
  timePassed?: number;
}

export const WorkoutLoadingState = ({ 
  message = "Gerando seu plano de treino personalizado", 
  onRetry, 
  timePassed = 0 
}: WorkoutLoadingStateProps) => {
  const [dots, setDots] = useState('');
  const [step, setStep] = useState(0);
  const [loadingTime, setLoadingTime] = useState(timePassed);
  const [showRetryOption, setShowRetryOption] = useState(false);
  
  const steps = [
    "Inicializando serviço",
    "Analisando preferências",
    "Selecionando exercícios ideais",
    "Montando rotina de treino",
    "Finalizando o plano"
  ];
  
  // Animate the dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length < 3 ? prev + '.' : '');
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  // Progress through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % steps.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Count loading time
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Show retry option after 30 seconds
  useEffect(() => {
    if (loadingTime > 30 && onRetry) {
      setShowRetryOption(true);
    }
  }, [loadingTime, onRetry]);
  
  // Display different patience messages based on loading time
  const getPatienceMessage = () => {
    if (loadingTime > 60) {
      return "A geração está demorando mais que o esperado. Você pode tentar novamente ou aguardar mais um pouco.";
    } else if (loadingTime > 30) {
      return "O serviço está demorando mais que o normal. Por favor, seja paciente enquanto nosso sistema trabalha na criação do seu plano personalizado.";
    } else if (loadingTime > 15) {
      return "Estamos finalizando seu plano. Isso pode levar alguns instantes adicionais.";
    }
    return null;
  };
  
  const patienceMessage = getPatienceMessage();
  const showPatienceMessage = patienceMessage !== null;
  
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-8 text-center">
      <div className="relative">
        <div className="w-24 h-24 border-t-4 border-primary border-solid rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Dumbbell className="w-10 h-10 text-primary" />
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">{message}{dots}</h3>
        <p className="text-muted-foreground max-w-md">
          Estamos criando um plano personalizado de acordo com suas preferências. 
          Isso pode levar alguns instantes.
        </p>
        
        {showPatienceMessage && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm mt-4 max-w-md mx-auto text-blue-700 dark:text-blue-300">
            <p>{patienceMessage}</p>
          </div>
        )}
        
        <div className="flex flex-col space-y-2 max-w-md mx-auto mt-4">
          {steps.map((stepText, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${index === step ? 'bg-primary animate-pulse' : index < step ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <p className={`text-sm ${index === step ? 'text-primary font-medium' : index < step ? 'text-green-600' : 'text-muted-foreground'}`}>
                {stepText}{index === step ? dots : index < step ? ' ✓' : ''}
              </p>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-muted-foreground mt-6">
          Tempo de carregamento: {loadingTime}s
        </div>
        
        {showRetryOption && onRetry && (
          <div className="mt-4">
            <Button 
              onClick={onRetry} 
              variant="outline" 
              className="border-primary hover:bg-primary/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
