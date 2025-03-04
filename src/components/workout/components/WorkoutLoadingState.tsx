
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface WorkoutLoadingStateProps {
  loadingTime: number;
  onRetry?: () => void;
  timePassed: boolean;
}

export const WorkoutLoadingState = ({ loadingTime, onRetry, timePassed }: WorkoutLoadingStateProps) => {
  // Calculate progress percentage (max 90% to indicate it's still loading)
  const progressPercentage = Math.min(90, (loadingTime / 30) * 100);
  
  // Determine loading message based on time
  let loadingMessage = "Coletando exercícios...";
  
  if (loadingTime > 5) {
    loadingMessage = "Analisando seu perfil...";
  }
  
  if (loadingTime > 10) {
    loadingMessage = "Organizando exercícios por grupo muscular...";
  }
  
  if (loadingTime > 20) {
    loadingMessage = "Montando o plano de treino...";
  }
  
  if (loadingTime > 40) {
    loadingMessage = "Quase lá! Finalizando seu plano personalizado...";
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-xl text-center">Gerando seu plano de treino</CardTitle>
        <CardDescription className="text-center">
          {timePassed ? 
            "Isso está demorando mais do que o esperado..." : 
            "Isso pode levar alguns instantes..."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center mb-6">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-center">{loadingMessage}</p>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            Tempo decorrido: {loadingTime} segundos
          </p>
        </div>
      </CardContent>
      
      {timePassed && onRetry && (
        <CardFooter>
          <button 
            onClick={onRetry}
            className="w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors"
          >
            Tentar novamente
          </button>
        </CardFooter>
      )}
    </Card>
  );
};
