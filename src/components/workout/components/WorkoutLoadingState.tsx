
import React, { useState, useEffect } from 'react';
import { Dumbbell } from 'lucide-react';

interface WorkoutLoadingStateProps {
  message?: string;
}

export const WorkoutLoadingState = ({ message = "Gerando seu plano de treino personalizado" }: WorkoutLoadingStateProps) => {
  const [dots, setDots] = useState('');
  const [step, setStep] = useState(0);
  
  const steps = [
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
      </div>
    </div>
  );
};
