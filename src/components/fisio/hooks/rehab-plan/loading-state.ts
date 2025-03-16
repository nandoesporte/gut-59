
import { useState, useEffect, useRef } from "react";

type LoadingPhase = "preparing" | "analyzing" | "generating" | "finalizing";

interface UseLoadingStateReturn {
  loading: boolean;
  setLoading: (isLoading: boolean) => void;
  loadingTime: number;
  loadingPhase: LoadingPhase;
  loadingMessage: string;
  loadingTimer: React.MutableRefObject<NodeJS.Timeout | null>;
}

export const useLoadingState = (): UseLoadingStateReturn => {
  const [loading, setLoading] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("preparing");
  const loadingTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loading) {
      loadingTimer.current = setInterval(() => {
        setLoadingTime(prev => {
          const newTime = prev + 1;
          
          if (newTime === 5 && loadingPhase === "preparing") {
            setLoadingPhase("analyzing");
          } else if (newTime === 15 && loadingPhase === "analyzing") {
            setLoadingPhase("generating");
          } else if (newTime === 30 && loadingPhase === "generating") {
            setLoadingPhase("finalizing");
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (loadingTimer.current) {
        clearInterval(loadingTimer.current);
        loadingTimer.current = null;
      }
      setLoadingPhase("preparing");
    }
    
    return () => {
      if (loadingTimer.current) {
        clearInterval(loadingTimer.current);
        loadingTimer.current = null;
      }
    };
  }, [loading, loadingPhase]);

  const getLoadingMessage = () => {
    switch (loadingPhase) {
      case "preparing":
        return `Preparando seu plano de reabilitação...`;
      case "analyzing":
        return `Analisando exercícios ideais para sua condição...`;
      case "generating":
        return `Gerando sequência de exercícios otimizada...`;
      case "finalizing":
        return `Finalizando seu plano personalizado...`;
      default:
        return `Gerando plano de reabilitação...`;
    }
  };

  return {
    loading,
    setLoading,
    loadingTime,
    loadingPhase,
    loadingMessage: getLoadingMessage(),
    loadingTimer
  };
};
