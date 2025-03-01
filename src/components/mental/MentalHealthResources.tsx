
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Info } from "lucide-react";

interface BreathingExercise {
  phase: "inhale" | "hold" | "exhale";
  count: number;
  totalBreaths: number;
  isComplete: boolean;
  secondsLeft: number;
}

interface MentalHealthSettings {
  id: string;
  breathing_exercise_daily_limit: number;
}

export const MentalHealthResources = () => {
  const [exercise, setExercise] = useState<BreathingExercise>({
    phase: "inhale",
    count: 0,
    totalBreaths: 5,
    isComplete: false,
    secondsLeft: 4,
  });
  const [dailyExercisesCount, setDailyExercisesCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const wallet = useWallet();

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
      totalBreaths: 5,
      isComplete: false,
      secondsLeft: 4,
    });
    breathe("inhale", 4);
  };

  const breathe = (phase: "inhale" | "hold" | "exhale", duration: number) => {
    setExercise(prev => ({
      ...prev,
      phase,
      secondsLeft: duration
    }));

    let secondsRemaining = duration;
    
    const newTimer = setInterval(() => {
      secondsRemaining -= 1;
      
      if (secondsRemaining <= 0) {
        clearInterval(newTimer);
        
        // Transition to next phase based on current phase
        if (phase === "inhale") {
          breathe("hold", 7); // Hold breath for 7 seconds
        } else if (phase === "hold") {
          breathe("exhale", 8); // Exhale for 8 seconds
        } else if (phase === "exhale") {
          setExercise(prev => {
            const newCount = prev.count + 1;
            if (newCount >= prev.totalBreaths) {
              completeExercise();
              return { ...prev, count: newCount, isComplete: true };
            } else {
              // Start new breath cycle
              breathe("inhale", 4);
              return { ...prev, count: newCount };
            }
          });
        }
      } else {
        setExercise(prev => ({
          ...prev,
          secondsLeft: secondsRemaining
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

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-primary">Técnica de Respiração 4-7-8</h3>
              <span className="text-sm text-muted-foreground">
                {dailyExercisesCount}/{dailyLimit} exercícios hoje
              </span>
            </div>
            
            <div className="bg-primary-50 p-4 rounded-lg flex items-center gap-3 mb-4">
              <Info className="h-5 w-5 text-primary-600 flex-shrink-0" />
              <p className="text-sm text-primary-800">
                A técnica 4-7-8 ajuda a reduzir ansiedade e melhorar o foco: <strong>inspire por 4 segundos</strong>, 
                <strong> segure por 7 segundos</strong> e <strong>expire por 8 segundos</strong>.
              </p>
            </div>
            
            {exercise.count > 0 && !exercise.isComplete ? (
              <div className="flex flex-col items-center space-y-6">
                <div className="w-64 h-64 relative">
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
                    <span className="text-sm font-medium text-muted-foreground">
                      Ciclo {exercise.count + 1} de {exercise.totalBreaths}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-medium mb-2" style={{ color: getPhaseColor() }}>
                    {getPhaseText()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {exercise.phase === "inhale" ? "Inspire pelo nariz" : 
                     exercise.phase === "hold" ? "Segure o ar" : 
                     "Expire pela boca lentamente"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button 
                  onClick={startBreathing}
                  disabled={dailyExercisesCount >= dailyLimit}
                  className="w-full py-6 text-lg"
                  size="lg"
                >
                  {dailyExercisesCount >= dailyLimit 
                    ? 'Limite diário atingido' 
                    : 'Iniciar Exercício de Respiração'}
                </Button>
                
                {exercise.isComplete && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <p className="text-green-800 font-medium">Exercício completado com sucesso!</p>
                    <p className="text-sm text-green-700 mt-1">Você ganhou 1 FIT como recompensa</p>
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
