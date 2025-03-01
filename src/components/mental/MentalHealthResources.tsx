
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Info, Timer, ArrowUp, ArrowDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Progress } from "@/components/ui/progress";

interface BreathingExercise {
  phase: "inhale" | "hold" | "exhale";
  count: number;
  totalBreaths: number;
  isComplete: boolean;
  secondsLeft: number;
  elapsedTime: number;
}

interface MentalHealthSettings {
  id: string;
  breathing_exercise_daily_limit: number;
}

export const MentalHealthResources = () => {
  const [exercise, setExercise] = useState<BreathingExercise>({
    phase: "inhale",
    count: 0,
    totalBreaths: 3, // Reduced total breaths to fit in 1 minute
    isComplete: false,
    secondsLeft: 4,
    elapsedTime: 0,
  });
  const [dailyExercisesCount, setDailyExercisesCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const wallet = useWallet();
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: settings, error } = await supabase
          .from('mental_health_settings')
          .select('*')
          .maybeSingle();

        if (error) throw error;
        
        if (settings) {
          setDailyLimit((settings as MentalHealthSettings).breathing_exercise_daily_limit);
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: exerciseCount, error: countError } = await supabase
          .from('fit_transactions')
          .select('count')
          .eq('transaction_type', 'breathing_exercise')
          .gte('created_at', today.toISOString())
          .maybeSingle();

        if (countError && countError.code !== 'PGRST116') throw countError;
        setDailyExercisesCount(exerciseCount?.count || 0);
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Erro ao carregar configurações');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [timer]);

  const startBreathing = () => {
    if (dailyExercisesCount >= dailyLimit) {
      toast.error(`Você atingiu o limite diário de ${dailyLimit} exercícios`);
      return;
    }
    
    // Set starting state to show feedback immediately
    setIsStarting(true);
    
    // Use setTimeout with 0ms to move exercise initialization to the next event loop
    // This allows the UI to update with the loading state first
    setTimeout(() => {
      setExercise({
        phase: "inhale",
        count: 0,
        totalBreaths: 3, // Reduced to fit in 1 minute
        isComplete: false,
        secondsLeft: 4,
        elapsedTime: 0,
      });
      
      breathe("inhale", 4, 0);
      setIsStarting(false);
    }, 0);
  };

  const breathe = (phase: "inhale" | "hold" | "exhale", duration: number, elapsedTime: number) => {
    setExercise(prev => ({
      ...prev,
      phase,
      secondsLeft: duration,
      elapsedTime
    }));

    let secondsRemaining = duration;
    
    const newTimer = setInterval(() => {
      secondsRemaining -= 1;
      const newElapsedTime = elapsedTime + 1;
      
      if (secondsRemaining <= 0) {
        clearInterval(newTimer);
        
        // Transition to next phase based on current phase
        if (phase === "inhale") {
          breathe("hold", 7, newElapsedTime); // Hold breath for 7 seconds
        } else if (phase === "hold") {
          breathe("exhale", 8, newElapsedTime); // Exhale for 8 seconds
        } else if (phase === "exhale") {
          setExercise(prev => {
            const newCount = prev.count + 1;
            if (newCount >= prev.totalBreaths || newElapsedTime >= 60) { // Stop at 1 minute (60 seconds)
              completeExercise();
              return { ...prev, count: newCount, isComplete: true, elapsedTime: newElapsedTime };
            } else {
              // Start new breath cycle
              breathe("inhale", 4, newElapsedTime);
              return { ...prev, count: newCount, elapsedTime: newElapsedTime };
            }
          });
        }
      } else {
        setExercise(prev => ({
          ...prev,
          secondsLeft: secondsRemaining,
          elapsedTime: newElapsedTime
        }));
      }
    }, 1000);

    setTimer(newTimer);
  };

  const completeExercise = async () => {
    try {
      await wallet.addTransaction({
        amount: 1,
        type: 'breathing_exercise',
        description: 'Exercício de respiração completado'
      });
      setDailyExercisesCount(prev => prev + 1);
      toast.success('Exercício completado! +1 FIT');
    } catch (error) {
      console.error('Error completing exercise:', error);
      toast.error('Erro ao completar exercício');
    }
  };

  const getPhaseColor = () => {
    switch (exercise.phase) {
      case "inhale": return "#4CAF50"; // Green for inhale
      case "hold": return "#FF9800";   // Orange for hold
      case "exhale": return "#2196F3";  // Blue for exhale
      default: return "#4CAF50";
    }
  };

  const getPhaseText = () => {
    switch (exercise.phase) {
      case "inhale": return "Inspire...";
      case "hold": return "Segure...";
      case "exhale": return "Expire...";
      default: return "Prepare-se...";
    }
  };

  const getInstructionText = () => {
    switch (exercise.phase) {
      case "inhale": return "Inspire lentamente pelo nariz";
      case "hold": return "Segure o ar nos pulmões";
      case "exhale": return "Expire completamente pela boca";
      default: return "";
    }
  };

  const getPhaseIcon = () => {
    switch (exercise.phase) {
      case "inhale": return <ArrowDown className="w-6 h-6 animate-bounce text-green-500" />;
      case "hold": return <div className="w-6 h-1 bg-amber-500 rounded-full animate-pulse"></div>;
      case "exhale": return <ArrowUp className="w-6 h-6 animate-bounce text-blue-500" />;
      default: return null;
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  const totalExerciseTime = 60; // 1 minute in seconds
  const progressPercentage = exercise.count > 0 && !exercise.isComplete 
    ? (exercise.elapsedTime / totalExerciseTime) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-primary">Técnica de Respiração 4-7-8</h3>
              <span className="text-sm text-muted-foreground">
                {dailyExercisesCount}/{dailyLimit} exercícios hoje
              </span>
            </div>
            
            <div className="bg-primary-50 p-3 sm:p-4 rounded-lg flex items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Info className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <p className={`text-xs sm:text-sm text-primary-800 ${isMobile ? 'leading-tight' : ''}`}>
                A técnica 4-7-8 ajuda a reduzir ansiedade e melhorar o foco: <strong>inspire por 4 segundos</strong>, 
                <strong> segure por 7 segundos</strong> e <strong>expire por 8 segundos</strong>.
                {!isMobile && ' Complete o exercício de 1 minuto para ganhar 1 FIT.'}
              </p>
            </div>
            
            {isMobile && (
              <p className="text-xs text-center text-muted-foreground -mt-2 mb-2">
                Complete o exercício de 1 minuto para ganhar 1 FIT.
              </p>
            )}
            
            {/* Dynamic Breathing Preview for Quick Start - Always visible */}
            {exercise.count === 0 && !exercise.isComplete && !isStarting && (
              <div className="flex flex-col items-center justify-center mb-2 py-2">
                <div className="flex items-center gap-2 bg-primary-50 px-6 py-3 rounded-full shadow-sm">
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-50" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute inset-1 bg-primary/20 rounded-full animate-ping opacity-50" style={{ animationDuration: '2.5s' }}></div>
                    <span className="relative font-medium text-primary">1:00</span>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Clique para começar o exercício de respiração
                </p>
              </div>
            )}
            
            {exercise.count > 0 && !exercise.isComplete ? (
              <div className="flex flex-col items-center space-y-4 sm:space-y-6">
                {/* Improved Progress bar for overall exercise */}
                <div className="w-full relative mt-2">
                  <Progress 
                    value={progressPercentage} 
                    className="h-3 sm:h-4 bg-gray-100"
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {Math.floor(exercise.elapsedTime)}s
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {totalExerciseTime}s
                    </p>
                  </div>
                </div>
                
                <div className={`w-48 h-48 sm:w-64 sm:h-64 relative ${isMobile ? 'mt-2' : 'mt-4'}`}>
                  <CircularProgressbar
                    value={(exercise.secondsLeft / (exercise.phase === "inhale" ? 4 : exercise.phase === "hold" ? 7 : 8)) * 100}
                    text={`${exercise.secondsLeft}s`}
                    styles={buildStyles({
                      pathColor: getPhaseColor(),
                      textColor: getPhaseColor(),
                      trailColor: '#e6e6e6',
                      textSize: '24px',
                      pathTransition: 'stroke-dashoffset 0.5s ease 0s',
                      strokeLinecap: 'round',
                    })}
                  />
                  
                  {/* Dynamic visual indicator */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                    <div className="bg-white/80 rounded-full p-6 shadow-sm">
                      {getPhaseIcon()}
                    </div>
                  </div>
                  
                  <div className="absolute top-3/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Ciclo {exercise.count + 1} de {exercise.totalBreaths}
                    </span>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-medium mb-1 sm:mb-2" style={{ color: getPhaseColor() }}>
                    {getPhaseText()}
                  </div>
                  <div className="text-sm sm:text-base text-muted-foreground">
                    {getInstructionText()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button 
                  onClick={startBreathing}
                  disabled={dailyExercisesCount >= dailyLimit || isStarting}
                  className="w-full py-4 sm:py-6 text-base sm:text-lg relative"
                  size="lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Timer className="h-5 w-5" />
                    {isStarting ? 'Preparando exercício...' : 
                     dailyExercisesCount >= dailyLimit ? 'Limite diário atingido' : 
                     'Iniciar Exercício de Respiração'}
                  </div>
                  
                  {isStarting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/90 rounded-md">
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </Button>
                
                {exercise.isComplete && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <p className="text-green-800 font-medium">Exercício completado com sucesso!</p>
                    <p className="text-xs sm:text-sm text-green-700 mt-1">Você ganhou 1 FIT como recompensa</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
