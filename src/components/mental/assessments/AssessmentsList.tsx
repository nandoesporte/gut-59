
import React from 'react';
import { assessments } from './assessmentData';
import { AssessmentCard } from './AssessmentCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarChart } from 'lucide-react';

export const AssessmentsList = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-primary/10 p-2 rounded-full">
          <BarChart className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-primary">Avaliações de Saúde Mental</h2>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Estas avaliações podem ajudar a identificar potenciais preocupações com sua saúde mental.
        Os resultados são confidenciais e podem ser úteis para você entender melhor seu bem-estar emocional.
      </p>
      
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-4`}>
        {assessments.map((assessment) => (
          <AssessmentCard key={assessment.id} assessment={assessment} />
        ))}
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-6">
        <p className="text-sm text-blue-800">
          <strong>Importante:</strong> Estas avaliações não substituem uma consulta com um profissional de saúde mental.
          Se você está enfrentando dificuldades, considere buscar ajuda profissional.
        </p>
      </div>
    </div>
  );
};
