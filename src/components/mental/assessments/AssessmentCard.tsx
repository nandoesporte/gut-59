
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, BarChart } from "lucide-react";
import { AssessmentType } from './AssessmentTypes';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface AssessmentCardProps {
  assessment: AssessmentType;
}

export const AssessmentCard = ({ assessment }: AssessmentCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className={`bg-gradient-to-r ${
        assessment.id === 'burnout' ? 'from-amber-100 to-amber-50' :
        assessment.id === 'anxiety' ? 'from-blue-100 to-blue-50' :
        assessment.id === 'stress' ? 'from-green-100 to-green-50' :
        'from-purple-100 to-purple-50'
      } pb-3`}>
        <CardTitle className="text-lg font-semibold">{assessment.title}</CardTitle>
        <CardDescription className="text-sm">{assessment.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">
          {assessment.questions.length} perguntas • Tempo estimado: {Math.ceil(assessment.questions.length * 0.5)} minutos
        </p>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0">
        <Button 
          variant="ghost" 
          size={isMobile ? "sm" : "default"} 
          onClick={() => navigate(`/mental?tab=assessments&type=${assessment.id}`)}
        >
          Ver Detalhes
        </Button>
        <Button 
          variant="default" 
          size={isMobile ? "sm" : "default"} 
          className="gap-1" 
          onClick={() => navigate(`/mental?tab=assessments&type=${assessment.id}&start=true`)}
        >
          Iniciar {isMobile ? "" : "Avaliação"} <ChevronRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
