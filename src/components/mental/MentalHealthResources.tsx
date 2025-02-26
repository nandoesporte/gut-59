import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import type { MentalModule, MentalVideo } from "../admin/mental/types";

interface BreathingExercise {
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
    count: 0,
    totalBreaths: 10,
    isComplete: false,
    secondsLeft: 5,
  });
  const [dailyExercisesCount, setDailyExercisesCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const wallet = useWallet();
  const [modules, setModules] = useState<MentalModule[]>([]);
  const [videos, setVideos] = useState<MentalVideo[]>([]);

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

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data: modulesData, error: modulesError } = await supabase
        .from('mental_modules')
        .select('*')
        .eq('status', 'active')
        .order('display_order');

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      const { data: videosData, error: videosError } = await supabase
        .from('mental_videos')
        .select(`
          *,
          mental_modules (
            name
          )
        `)
        .eq('status', 'active');

      if (videosError) throw videosError;
      setVideos(videosData || []);
    } catch (error) {
      console.error('Error fetching mental health resources:', error);
      toast.error('Erro ao carregar recursos de saúde mental');
    }
  };

  const getVideoPreview = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return null;
  };

  const startBreathing = () => {
    if (dailyExercisesCount >= dailyLimit) {
      toast.error(`Você atingiu o limite diário de ${dailyLimit} exercícios`);
      return;
    }
    setExercise({
      count: 0,
      totalBreaths: 10,
      isComplete: false,
      secondsLeft: 5,
    });
    breathe();
  };

  const breathe = () => {
    if (exercise.count < exercise.totalBreaths) {
      const newTimer = setInterval(() => {
        setExercise(prev => {
          if (prev.secondsLeft > 1) {
            return { ...prev, secondsLeft: prev.secondsLeft - 1 };
          } else {
            clearInterval(newTimer);
            return {
              ...prev,
              count: prev.count + 1,
              secondsLeft: 5,
            };
          }
        });
      }, 1000);

      setTimer(newTimer);

      setTimeout(() => {
        clearInterval(newTimer);
        setExercise(prev => {
          if (prev.count + 1 < prev.totalBreaths) {
            breathe();
            return prev;
          } else {
            return { ...prev, isComplete: true };
          }
        });
      }, 5000);
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
    <div className="space-y-6">
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
              <div className="flex flex-col items-center space-y-4">
                <div className="w-48 h-48">
                  <CircularProgressbar
                    value={(exercise.secondsLeft / 5) * 100}
                    text={`${exercise.secondsLeft}s`}
                    styles={buildStyles({
                      pathColor: exercise.count % 2 === 0 ? '#4CAF50' : '#2196F3',
                      textColor: exercise.count % 2 === 0 ? '#4CAF50' : '#2196F3',
                      trailColor: '#d6d6d6',
                    })}
                  />
                </div>
                <div className="text-center text-xl font-medium" style={{
                  color: exercise.count % 2 === 0 ? '#4CAF50' : '#2196F3'
                }}>
                  {exercise.count % 2 === 0 ? "Inspire..." : "Expire..."}
                </div>
                <div className="text-sm text-muted-foreground">
                  Respiração {exercise.count + 1} de {exercise.totalBreaths}
                </div>
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

      {modules.map((module) => (
        <Card key={module.id}>
          <CardHeader>
            <CardTitle className="text-lg">{module.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {module.description && (
              <p className="text-sm text-muted-foreground">{module.description}</p>
            )}
            <div className="grid gap-4">
              {videos
                .filter(video => video.module_id === module.id)
                .map(video => (
                  <Card key={video.id} className="p-4">
                    <div className="space-y-4">
                      <h4 className="font-medium">{video.title}</h4>
                      {video.description && (
                        <p className="text-sm text-muted-foreground">{video.description}</p>
                      )}
                      {getVideoPreview(video.url) && (
                        <div className="aspect-video">
                          <iframe
                            src={getVideoPreview(video.url)}
                            className="w-full h-full rounded-lg"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
