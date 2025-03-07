
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, AlertCircle, Wind, Brain, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmotionLog {
  emotion: string;
  created_at: string;
}

interface BreathingSession {
  duration: number;
  created_at: string;
}

export const MentalHealthSummary = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestEmotion, setLatestEmotion] = useState<EmotionLog | null>(null);
  const [latestBreathingSession, setLatestBreathingSession] = useState<BreathingSession | null>(null);
  const [hasChatInteraction, setHasChatInteraction] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMentalHealthData = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch the latest emotion log
        const { data: emotions, error: emotionsError } = await supabase
          .from('emotion_logs')
          .select('emotion, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (emotionsError) throw emotionsError;

        // Fetch the latest breathing exercise session (placeholder - adjust table name as needed)
        const { data: breathingSessions, error: breathingError } = await supabase
          .from('breathing_sessions')
          .select('duration, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Check if user has interacted with the AI counselor
        const { count, error: chatError } = await supabase
          .from('mental_chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .limit(1);

        if (chatError) throw chatError;

        setLatestEmotion(emotions?.[0] || null);
        setLatestBreathingSession(breathingSessions || null);
        setHasChatInteraction(count !== null && count > 0);
      } catch (error) {
        console.error('Error fetching mental health data:', error);
        setError('Não foi possível carregar os dados de saúde mental.');
      } finally {
        setLoading(false);
      }
    };

    fetchMentalHealthData();
  }, []);

  const handleNavigateToMental = () => {
    navigate('/mental');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const getEmotionLabel = (emotionId: string) => {
    const emotions: Record<string, string> = {
      'happy': 'Muito Feliz',
      'good': 'Bem',
      'neutral': 'Neutro',
      'sad': 'Triste',
      'angry': 'Irritado'
    };
    return emotions[emotionId] || emotionId;
  };

  const getEmotionColor = (emotionId: string) => {
    const colors: Record<string, string> = {
      'happy': 'text-green-500',
      'good': 'text-blue-500',
      'neutral': 'text-yellow-500',
      'sad': 'text-purple-500',
      'angry': 'text-red-500'
    };
    return colors[emotionId] || 'text-gray-500';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If there's no mental health data yet
  if (!latestEmotion && !latestBreathingSession && !hasChatInteraction) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium flex items-center justify-center gap-2">
              <Brain className="h-5 w-5 text-indigo-500" />
              Saúde Mental
            </h3>
            <p className="text-gray-600">
              Você ainda não possui dados de saúde mental registrados.
            </p>
            <Button onClick={handleNavigateToMental} className="w-full sm:w-auto">
              Começar minha jornada mental
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <div className="bg-indigo-50 px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-600" />
          Saúde Mental
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNavigateToMental}
          className="text-sm"
        >
          Ver detalhes
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {latestEmotion && (
            <div className="p-4 flex items-center">
              <div className="bg-indigo-100 p-3 rounded-full mr-4">
                <MessageSquare className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">Seu humor recente</p>
                <p className={`text-xl font-bold ${getEmotionColor(latestEmotion.emotion)}`}>
                  {getEmotionLabel(latestEmotion.emotion)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(latestEmotion.created_at)}
                </p>
              </div>
            </div>
          )}

          {latestBreathingSession && (
            <div className="p-4 flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <Wind className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">Exercício de respiração</p>
                <p className="text-xl font-bold">{latestBreathingSession.duration} minutos</p>
                <p className="text-sm text-gray-500">
                  {formatDate(latestBreathingSession.created_at)}
                </p>
              </div>
            </div>
          )}

          {hasChatInteraction && (
            <div className="p-4 flex items-center">
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <Brain className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">IA Conselheira</p>
                <p className="text-xl font-bold">Sessão Ativa</p>
                <p className="text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer" onClick={handleNavigateToMental}>
                  Continuar conversa
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
