
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, BookOpen, Heart, ArrowRight, Smile, SmilePlus, Frown, Meh, Angry } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const MentalHealthSummary = () => {
  const navigate = useNavigate();
  const [latestEmotion, setLatestEmotion] = useState<{emotion: string, date: Date} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestEmotion = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("Usuário não autenticado");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('emotion_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is normal for new users
            console.log("Erro ao buscar última emoção:", error);
          }
          setLoading(false);
          return;
        }

        if (data) {
          setLatestEmotion({
            emotion: data.emotion,
            date: new Date(data.created_at)
          });
        }
      } catch (error) {
        console.error("Erro ao buscar última emoção:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestEmotion();
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case 'happy':
        return <SmilePlus className="h-5 w-5 text-green-500" />;
      case 'good':
        return <Smile className="h-5 w-5 text-blue-500" />;
      case 'neutral':
        return <Meh className="h-5 w-5 text-yellow-500" />;
      case 'sad':
        return <Frown className="h-5 w-5 text-pink-500" />;
      case 'angry':
        return <Angry className="h-5 w-5 text-orange-500" />;
      default:
        return null;
    }
  };

  const getEmotionLabel = (emotion: string) => {
    switch (emotion) {
      case 'happy': return 'Muito Feliz';
      case 'good': return 'Bem';
      case 'neutral': return 'Neutro';
      case 'sad': return 'Triste';
      case 'angry': return 'Irritado';
      default: return '';
    }
  };

  const getEmotionBgColor = (emotion: string) => {
    switch (emotion) {
      case 'happy': return 'bg-[#F2FCE2]';
      case 'good': return 'bg-[#D3E4FD]';
      case 'neutral': return 'bg-[#FEF7CD]';
      case 'sad': return 'bg-[#FFDEE2]';
      case 'angry': return 'bg-[#FEC6A1]';
      default: return 'bg-gray-100';
    }
  };

  return (
    <Card className="w-full border-none shadow-sm overflow-hidden bg-white dark:bg-gray-800">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full">
                <BrainCircuit className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-primary-800 dark:text-primary-300">Saúde Mental</h3>
                <p className="text-xs text-primary-600/80 dark:text-primary-400/80">
                  Cuide da sua mente
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleNavigate('/mental')}
              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 p-1 h-auto"
            >
              Acessar <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>

          {latestEmotion && (
            <div className={`${getEmotionBgColor(latestEmotion.emotion)} rounded-lg p-2.5 flex justify-between items-center`}>
              <div className="flex items-center gap-2">
                {getEmotionIcon(latestEmotion.emotion)}
                <div>
                  <p className="text-xs font-medium text-gray-700">Seu humor hoje</p>
                  <p className="text-sm font-semibold text-gray-800">{getEmotionLabel(latestEmotion.emotion)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {format(latestEmotion.date, "dd 'de' MMM", { locale: ptBR })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div 
              className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 rounded-lg p-2.5 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center text-primary-600 dark:text-primary-400 mb-1">
                <Heart className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">Conversar</span>
              </div>
              <p className="text-xs text-primary-600/80 dark:text-primary-300/90 line-clamp-1">
                Dialogue com assistente
              </p>
            </div>
            
            <div 
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-lg p-2.5 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center text-indigo-600 dark:text-indigo-400 mb-1">
                <BookOpen className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">Aprender</span>
              </div>
              <p className="text-xs text-indigo-600/80 dark:text-indigo-300/90 line-clamp-1">
                Vídeos e recursos
              </p>
            </div>
            
            <div 
              className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-800/20 rounded-lg p-2.5 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center text-violet-600 dark:text-violet-400 mb-1">
                <BrainCircuit className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">Módulos</span>
              </div>
              <p className="text-xs text-violet-600/80 dark:text-violet-300/90 line-clamp-1">
                Módulos temáticos
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
