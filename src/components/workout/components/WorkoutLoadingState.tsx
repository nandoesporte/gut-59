
import React from 'react';
import { Dumbbell } from 'lucide-react';

interface WorkoutLoadingStateProps {
  message?: string;
}

export const WorkoutLoadingState = ({ message = "Carregando..." }: WorkoutLoadingStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-8 text-center">
      <div className="relative">
        <div className="w-24 h-24 border-t-4 border-primary border-solid rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Dumbbell className="w-10 h-10 text-primary" />
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">{message}</h3>
        <p className="text-muted-foreground max-w-md">
          Estamos criando um plano personalizado de acordo com suas preferências. 
          Isso pode levar alguns instantes.
        </p>
        
        <div className="flex flex-col space-y-2 max-w-md mx-auto mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <p className="text-sm text-muted-foreground">Analisando preferências...</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-300"></div>
            <p className="text-sm text-muted-foreground">Selecionando exercícios ideais...</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-700"></div>
            <p className="text-sm text-muted-foreground">Montando rotina de treino...</p>
          </div>
        </div>
      </div>
    </div>
  );
};
