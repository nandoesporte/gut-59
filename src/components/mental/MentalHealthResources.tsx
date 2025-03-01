
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Info } from "lucide-react";
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
  const wallet = useWallet();
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: settings, error } = await supabase
          .from('mental_health_settings')
          .select('*')
          .single();

        if (error) throw error;
        setDailyLimit((settings as MentalHealthSettings).breathing_exercise_daily_limit);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: exerciseCount, error: countError } = await supabase
          .from('fit_transactions')
          .select('count')
          .eq('transaction_type', 'breathing_exercise')
          .gte('created_at', today.toISOString())
          .single();

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
    setExercise({
      phase: "inhale",
      count: 0,
      totalBreaths: 3, // Reduced to fit in 1 minute
      isComplete: false,
      secondsLeft: 4,
      elapsedTime: 0,
    });
    breathe("inhale", 4, 0);
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
            
            {exercise.count > 0 && !exercise.isComplete ? (
              <div className="flex flex-col items-center space-y-4 sm:space-y-6">
                {/* Progress bar for overall exercise */}
                <div className="w-full">
                  <Progress value={progressPercentage} className="h-2" />
                  <p className="text-xs text-center mt-1 text-muted-foreground">
                    {Math.floor(exercise.elapsedTime)}s / {totalExerciseTime}s
                  </p>
                </div>
                
                <div className={`w-48 h-48 sm:w-64 sm:h-64 relative ${isMobile ? 'mt-2' : 'mt-4'}`}>
                  <CircularProgressbar
                    value={(exercise.secondsLeft / (exercise.phase === "inhale" ? 4 : exercise.phase === "hold" ? 7 : 8)) * 100}
                    text={`${exercise.secondsLeft}s`}
                    styles={buildStyles({
                      pathColor: getPhaseColor(),
                      textColor: getPhaseColor(),
                      trailColor: '#e6e6e6',
                      textSize: '20px',
                      pathTransition: 'stroke-dashoffset 0.5s ease 0s',
                    })}
                  />
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
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {getInstructionText()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button 
                  onClick={startBreathing}
                  disabled={dailyExercisesCount >= dailyLimit}
                  className="w-full py-4 sm:py-6 text-base sm:text-lg"
                  size="lg"
                >
                  {dailyExercisesCount >= dailyLimit 
                    ? 'Limite diário atingido' 
                    : 'Iniciar Exercício de Respiração'}
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
