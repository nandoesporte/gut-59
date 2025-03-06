
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { RotateCcw } from "lucide-react";

interface WorkoutLoadingStateProps {
  loadingTime: number;
  loadingPhase?: string;
  loadingMessage?: string;
  onRetry: () => void;
  timePassed: boolean;
}

export const WorkoutLoadingState = ({
  loadingTime,
  loadingPhase = "preparing",
  loadingMessage,
  onRetry,
  timePassed,
}: WorkoutLoadingStateProps) => {
  // Calculate progress for the visual indicator (max 100 seconds)
  const MAX_TIME = 60;
  const progressPercentage = Math.min(100, (loadingTime / MAX_TIME) * 100);

  // Determine color based on loading phase
  const getProgressColor = () => {
    switch (loadingPhase) {
      case "preparing":
        return "#3b82f6"; // blue-500
      case "analyzing":
        return "#8b5cf6"; // violet-500
      case "generating":
        return "#10b981"; // emerald-500
      case "finalizing":
        return "#f59e0b"; // amber-500
      default:
        return "#3b82f6"; // Default blue
    }
  };

  // Default message based on phase if not provided
  const getDefaultMessage = () => {
    switch (loadingPhase) {
      case "preparing":
        return "Preparando seu plano de treino...";
      case "analyzing":
        return "Analisando exercícios ideais para seu perfil...";
      case "generating":
        return "Gerando sequência de treinos otimizada...";
      case "finalizing":
        return "Finalizando seu plano personalizado...";
      default:
        return "Gerando seu plano de treino...";
    }
  };

  const message = loadingMessage || getDefaultMessage();
  const progressColor = getProgressColor();

  return (
    <Card className="w-full p-8 flex flex-col items-center justify-center">
      <div className="w-40 h-40 mb-6">
        <CircularProgressbar
          value={progressPercentage}
          text={`${loadingTime}s`}
          styles={buildStyles({
            strokeLinecap: "round",
            textSize: "16px",
            pathTransitionDuration: 0.5,
            pathColor: progressColor,
            textColor: progressColor,
            trailColor: "#e6e6e6",
          })}
        />
      </div>

      <h3 className="text-xl font-semibold mb-3 text-center">{message}</h3>

      <p className="text-gray-500 text-center mb-6 max-w-md">
        Estamos montando seu plano de treino personalizado com base nas suas preferências.
        Isso pode levar alguns instantes.
      </p>

      {timePassed && (
        <div className="mt-4">
          <Button
            onClick={onRetry}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Tentar Novamente
          </Button>
        </div>
      )}
    </Card>
  );
};
