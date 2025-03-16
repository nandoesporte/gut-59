
import React from 'react';
import { Stethoscope } from 'lucide-react';

export const FisioHeader: React.FC = () => {
  return (
    <div className="text-center space-y-2">
      <div className="inline-flex items-center justify-center p-1.5 sm:p-2 bg-primary/10 rounded-full">
        <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
      </div>
      <h1 className="text-lg sm:text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-600">
        Fisioterapia Personalizada
      </h1>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto px-2">
        Crie um plano de reabilitação personalizado baseado em suas necessidades específicas
      </p>
    </div>
  );
};
