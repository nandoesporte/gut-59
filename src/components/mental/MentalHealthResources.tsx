
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { Info, Timer } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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

// Define breathing cycle durations in seconds
const BREATHING_CYCLE = {
  inhale: 4,
  hold: 7,
  exhale: 8
};

// Colors for each breathing phase
const PHASE_COLORS = {
  inhale: "#48A1A1", // Teal color like in the image
  hold: "#9b87f5",   // Purple
  exhale: "#7E69AB"  // Darker purple
};

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
        secondsLeft: BREATHING_CYCLE.inhale,
        elapsedTime: 0,
      });
      
      breathe("inhale", BREATHING_CYCLE.inhale, 0);
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
          breathe("hold", BREATHING_CYCLE.hold, newElapsedTime); // Hold breath
        } else if (phase === "hold") {
          breathe("exhale", BREATHING_CYCLE.exhale, newElapsedTime); // Exhale
        } else if (phase === "exhale") {
          setExercise(prev => {
            const newCount = prev.count + 1;
            if (newCount >= prev.totalBreaths || newElapsedTime >= 60) { // Stop at 1 minute (60 seconds)
              completeExercise();
              return { ...prev, count: newCount, isComplete: true, elapsedTime: newElapsedTime };
            } else {
              // Start new breath cycle
              breathe("inhale", BREATHING_CYCLE.inhale, newElapsedTime);
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

  const getPhaseText = () => {
    switch (exercise.phase) {
      case "inhale": return "Inspire";
      case "hold": return "Segure";
      case "exhale": return "Expire";
      default: return "Prepare-se";
    }
  };

  const getPhaseColor = () => {
    return PHASE_COLORS[exercise.phase];
  };

  const getPhaseInstruction = () => {
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
              <div className="flex flex-col items-center space-y-6">
                {/* Progress information */}
                <div className="w-full text-center">
                  <p className="text-sm text-muted-foreground">
                    Ciclo {exercise.count + 1} de {exercise.totalBreaths} • 
                    <span className="ml-1">{Math.floor(exercise.elapsedTime)}s/{totalExerciseTime}s</span>
                  </p>
                </div>
                
                {/* Main breathing circle - simplified to match the image */}
                <div className="relative flex items-center justify-center">
                  {/* Outer circle with pulsing border */}
                  <div 
                    className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full transition-all duration-300"
                    style={{ 
                      border: `2px solid ${getPhaseColor()}80`, 
                      boxShadow: `0 0 15px ${getPhaseColor()}50`
                    }}
                  ></div>
                  
                  {/* Colored circle for breathing visualization */}
                  <div 
                    className="relative flex items-center justify-center w-60 h-60 sm:w-68 sm:h-68 rounded-full transition-all duration-500 mx-auto"
                    style={{ 
                      backgroundColor: getPhaseColor(),
                      transform: exercise.phase === "inhale" 
                        ? "scale(1.0)" 
                        : exercise.phase === "hold" 
                          ? "scale(1.0)" 
                          : "scale(0.85)"
                    }}
                  >
                    {/* Central text showing phase */}
                    <div className="text-center">
                      <div className="text-white text-lg font-medium mb-1">
                        {getPhaseText()}
                      </div>
                      
                      {/* Small counter in the center */}
                      <div className="text-white text-3xl font-bold">
                        {exercise.secondsLeft}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Instructions below the circle */}
                <div className="text-center text-sm text-muted-foreground mt-2">
                  {getPhaseInstruction()}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Initial state circle representation */}
                {!exercise.isComplete && !isStarting && (
                  <div className="flex flex-col items-center justify-center py-4">
                    <div 
                      className="relative flex flex-col items-center justify-center w-60 h-60 sm:w-68 sm:h-68 rounded-full border-2 border-gray-300 mb-4"
                      style={{
                        backgroundColor: "#48A1A1", // Teal color like in the image
                        boxShadow: "0 0 15px rgba(72, 161, 161, 0.3)"
                      }}
                    >
                      <div className="text-center">
                        <div className="text-white text-lg font-medium mb-1">
                          Segura
                        </div>
                        
                        {/* Static demo counter */}
                        <div className="text-white text-3xl font-bold">
                          7
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-4 text-sm mt-2 mb-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: PHASE_COLORS.inhale}}></div>
                        <span className="text-xs mt-1">Inspire: 4s</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: PHASE_COLORS.hold}}></div>
                        <span className="text-xs mt-1">Segure: 7s</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: PHASE_COLORS.exhale}}></div>
                        <span className="text-xs mt-1">Expire: 8s</span>
                      </div>
                    </div>
                  </div>
                )}
                
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
