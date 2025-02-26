
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";

interface BreathingExercise {
  count: number;
  totalBreaths: number;
  isComplete: boolean;
}

interface MentalHealthSettings {
  id: string;
  breathing_exercise_daily_limit: number;
}

export const MentalHealthResources = () => {
  const [exercise, setExercise] = useState<BreathingExercise>({
    count: 0,
    totalBreaths: 10,
    isComplete: false,
  });
  const [dailyExercisesCount, setDailyExercisesCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5); // Default value
  const [isLoading, setIsLoading] = useState(true);
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
        
        // Fetch today's exercise count
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

  const startBreathing = () => {
    if (dailyExercisesCount >= dailyLimit) {
      toast.error(`Você atingiu o limite diário de ${dailyLimit} exercícios`);
      return;
    }
    setExercise({ count: 0, totalBreaths: 10, isComplete: false });
    breathe();
  };

  const breathe = () => {
    if (exercise.count < exercise.totalBreaths) {
      setTimeout(() => {
        setExercise(prev => ({
          ...prev,
          count: prev.count + 1,
        }));
        breathe();
      }, 5000); // 5 seconds per breath
    } else {
      setExercise(prev => ({ ...prev, isComplete: true }));
      completeExercise();
    }
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

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Exercícios de Respiração</h3>
              <span className="text-sm text-muted-foreground">
                {dailyExercisesCount}/{dailyLimit} exercícios hoje
              </span>
            </div>
            
            {exercise.count > 0 && !exercise.isComplete ? (
              <div className="space-y-2">
                <div className="text-center text-xl">
                  {exercise.count % 2 === 0 ? "Inspire..." : "Expire..."}
                </div>
                <Progress value={(exercise.count / exercise.totalBreaths) * 100} />
              </div>
            ) : (
              <Button 
                onClick={startBreathing}
                disabled={dailyExercisesCount >= dailyLimit}
                className="w-full"
              >
                {dailyExercisesCount >= dailyLimit 
                  ? 'Limite diário atingido' 
                  : 'Iniciar Exercício'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
