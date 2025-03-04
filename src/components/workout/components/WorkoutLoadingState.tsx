
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import { Dumbbell, RefreshCw } from "lucide-react";
import 'react-circular-progressbar/dist/styles.css';

interface WorkoutLoadingStateProps {
  message: string;
  onRetry: () => void;
  timePassed: number;
}

export const WorkoutLoadingState = ({ message, onRetry, timePassed }: WorkoutLoadingStateProps) => {
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Iniciando...");
  const [isRetryVisible, setIsRetryVisible] = useState(false);

  // Effect to update progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (progress < 90) {
        setProgress(prev => {
          // Slow down progress as we approach 90%
          const increment = prev < 30 ? 5 : prev < 60 ? 3 : 1;
          return Math.min(prev + increment, 90);
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [progress]);

  // Effect to show retry button after a reasonable time
  useEffect(() => {
    const retryTimeout = setTimeout(() => {
      setIsRetryVisible(true);
    }, 30000); // Show retry after 30 seconds

    return () => clearTimeout(retryTimeout);
  }, []);

  // Effect to update loading message based on time passed
  useEffect(() => {
    if (timePassed < 3) {
      setLoadingMessage("Inicializando serviço...");
    } else if (timePassed < 8) {
      setLoadingMessage("Analisando suas preferências...");
    } else if (timePassed < 15) {
      setLoadingMessage("Selecionando exercícios adequados...");
    } else if (timePassed < 25) {
      setLoadingMessage("Criando estrutura do treino...");
    } else if (timePassed < 40) {
      setLoadingMessage("Ajustando intensidade e volumes...");
    } else {
      setLoadingMessage("Finalizando seu plano personalizado...");
    }
  }, [timePassed]);

  return (
    <Card className="w-full max-w-lg mx-auto border-none shadow-md overflow-hidden">
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-32 h-32 relative">
            <CircularProgressbar
              value={progress}
              strokeWidth={6}
              styles={buildStyles({
                rotation: 0.25,
                strokeLinecap: 'round',
                pathTransitionDuration: 0.5,
                pathColor: `var(--primary)`,
                trailColor: 'var(--muted)',
              })}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Dumbbell className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{message}</h3>
            <p className="text-muted-foreground">{loadingMessage}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Tempo decorrido: {timePassed} {timePassed === 1 ? 'segundo' : 'segundos'}
            </p>
          </div>

          {timePassed > 45 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 rounded-md text-sm">
              <p>Estamos demorando mais que o normal. Por favor, aguarde ou tente novamente.</p>
            </div>
          )}

          {isRetryVisible && (
            <Button 
              variant="outline" 
              onClick={onRetry}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
