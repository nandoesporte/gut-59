
import React, { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, 
  CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, ChevronRight, RotateCcw, CheckCircle, 
  AlertTriangle, Info, Loader2, ArrowLeft 
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  AssessmentType, AssessmentQuestion, 
  AssessmentResponse, AssessmentResult 
} from './AssessmentTypes';
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

interface AssessmentTakerProps {
  assessment: AssessmentType;
}

export const AssessmentTaker = ({ assessment }: AssessmentTakerProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const totalQuestions = assessment.questions.length;
  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progress = (currentQuestionIndex / totalQuestions) * 100;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isResponseComplete = Object.keys(responses).length === totalQuestions;

  const handleNextQuestion = () => {
    if (responses[currentQuestion.id] === undefined) {
      toast.error("Por favor, selecione uma resposta antes de continuar.");
      return;
    }
    
    if (isLastQuestion) {
      calculateResult();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
  };

  const handleResponseChange = (questionId: number, value: number) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const calculateResult = async () => {
    try {
      setIsSubmitting(true);
      
      // Calculate total score
      let totalScore = 0;
      
      for (const question of assessment.questions) {
        const response = responses[question.id];
        
        // If question is reversed, invert the score
        if (question.reversed) {
          // For anxiety and depression (0-3 scale)
          if (assessment.id === 'anxiety' || assessment.id === 'depression') {
            totalScore += (3 - response);
          } 
          // For burnout and stress (0-4 scale)
          else {
            totalScore += (4 - response);
          }
        } else {
          totalScore += response;
        }
      }
      
      // Get result interpretation
      const assessmentResult = assessment.getResult(totalScore);
      setResult(assessmentResult);
      
      // Save result to database
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const assessmentResponse: AssessmentResponse = {
          user_id: user.id,
          assessment_type: assessment.id,
          responses: responses,
          score: totalScore
        };
        
        const { error } = await supabase
          .from('health_assessments')
          .insert([assessmentResponse]);
          
        if (error) {
          console.error("Error saving assessment result:", error);
          toast.error("Erro ao salvar resultado. Tente novamente.");
        } else {
          toast.success("Avaliação concluída com sucesso!");
        }
      } else {
        // If user is not logged in, just show the result without saving
        toast.success("Avaliação concluída com sucesso!");
      }
    } catch (error) {
      console.error("Error calculating result:", error);
      toast.error("Erro ao calcular resultado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAssessment = () => {
    setCurrentQuestionIndex(0);
    setResponses({});
    setResult(null);
  };

  const getAnswerLabel = (value: number) => {
    // For anxiety and depression (0-3 scale)
    if (assessment.id === 'anxiety' || assessment.id === 'depression') {
      switch (value) {
        case 0: return 'Nunca';
        case 1: return 'Vários dias';
        case 2: return 'Mais da metade dos dias';
        case 3: return 'Quase todos os dias';
      }
    } 
    // For burnout and stress (0-4 scale)
    else {
      switch (value) {
        case 0: return 'Nunca';
        case 1: return 'Raramente';
        case 2: return 'Às vezes';
        case 3: return 'Frequentemente';
        case 4: return 'Sempre';
      }
    }
  };

  const getMaxValue = () => {
    // For anxiety and depression (0-3 scale)
    return (assessment.id === 'anxiety' || assessment.id === 'depression') ? 3 : 4;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'severe': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'moderate': return <Info className="h-5 w-5 text-yellow-500" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'severe': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-2" 
        onClick={() => navigate("/mental?tab=assessments")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar às Avaliações
      </Button>

      <Card className="overflow-hidden">
        <CardHeader className={`bg-gradient-to-r ${
          assessment.id === 'burnout' ? 'from-amber-100 to-amber-50' :
          assessment.id === 'anxiety' ? 'from-blue-100 to-blue-50' :
          assessment.id === 'stress' ? 'from-green-100 to-green-50' :
          'from-purple-100 to-purple-50'
        }`}>
          <CardTitle>{assessment.title}</CardTitle>
          <CardDescription>{assessment.description}</CardDescription>
          {!result && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-right mt-1">
                Questão {currentQuestionIndex + 1} de {totalQuestions}
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6">
          {result ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 mb-4">
                {getLevelIcon(result.level)}
                <h3 className="text-lg font-semibold">
                  Resultado: {
                    result.level === 'low' ? 'Baixo' :
                    result.level === 'moderate' ? 'Moderado' :
                    result.level === 'high' ? 'Alto' :
                    'Severo'
                  }
                </h3>
              </div>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="font-medium mb-2">Pontuação: {result.score} / {getMaxValue() * totalQuestions}</p>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getLevelColor(result.level)}`} 
                    style={{ width: `${(result.score / (getMaxValue() * totalQuestions)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <p className="font-medium mb-2">Interpretação:</p>
                <p className="text-sm mb-4">{result.interpretation}</p>
              </div>
              
              <div>
                <p className="font-medium mb-2">Recomendações:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Nota importante:</strong> Esta avaliação serve apenas como uma ferramenta de autoconhecimento.
                  Se você está enfrentando dificuldades, considere conversar com um profissional de saúde mental
                  para uma avaliação completa e orientação adequada.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="font-semibold mb-1">{assessment.instructions}</p>
              </div>
              
              <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="text-base font-medium mb-4">
                  {currentQuestion.text}
                </h3>
                
                <RadioGroup 
                  value={responses[currentQuestion.id]?.toString()} 
                  onValueChange={(value) => handleResponseChange(currentQuestion.id, parseInt(value))}
                  className="space-y-3"
                >
                  {Array.from({ length: getMaxValue() + 1 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="font-normal">
                        {index} - {getAnswerLabel(index)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className={`${isMobile ? 'flex-col space-y-2' : 'flex justify-between'} p-6 pt-2 bg-gray-50`}>
          {result ? (
            <div className={`${isMobile ? 'w-full' : 'flex justify-between w-full'}`}>
              <Button 
                variant="outline" 
                onClick={resetAssessment}
                className={`${isMobile ? 'w-full mb-2' : ''}`}
              >
                <RotateCcw className="h-4 w-4 mr-2" /> 
                Refazer Avaliação
              </Button>
              <Button 
                onClick={() => navigate("/mental?tab=assessments")}
                className={`${isMobile ? 'w-full' : ''}`}
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> 
                Voltar às Avaliações
              </Button>
            </div>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={handlePreviousQuestion} 
                disabled={currentQuestionIndex === 0}
                className={`${isMobile ? 'w-full' : ''}`}
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
              </Button>
              <Button 
                onClick={handleNextQuestion}
                disabled={responses[currentQuestion.id] === undefined || isSubmitting}
                className={`${isMobile ? 'w-full' : ''}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                    Processando...
                  </>
                ) : (
                  <>
                    {isLastQuestion ? 'Concluir' : 'Próxima'} 
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
