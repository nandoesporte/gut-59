
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
        return <SmilePlus className="h-5 w-5 text-green-600" />;
      case 'good':
        return <Smile className="h-5 w-5 text-blue-600" />;
      case 'neutral':
        return <Meh className="h-5 w-5 text-yellow-600" />;
      case 'sad':
        return <Frown className="h-5 w-5 text-pink-600" />;
      case 'angry':
        return <Angry className="h-5 w-5 text-orange-600" />;
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
    <Card className="w-full border-none shadow-md overflow-hidden bg-gradient-to-r from-purple-50 to-white dark:from-gray-800 dark:to-gray-900">
      <CardContent className="p-6">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full">
                <BrainCircuit className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300">Saúde Mental</h3>
                <p className="text-sm text-purple-600/80 dark:text-purple-400/80">
                  Cuide da sua mente
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleNavigate('/mental')}
              className="bg-white hover:bg-purple-50 border-purple-200 text-purple-700 hover:text-purple-800 transition-all"
            >
              Acessar <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          {latestEmotion && (
            <div className={`${getEmotionBgColor(latestEmotion.emotion)} rounded-xl p-3 mb-3 flex justify-between items-center`}>
              <div className="flex items-center gap-2">
                {getEmotionIcon(latestEmotion.emotion)}
                <div>
                  <p className="text-sm font-medium">Seu humor hoje</p>
                  <p className="text-md font-semibold">{getEmotionLabel(latestEmotion.emotion)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                {format(latestEmotion.date, "dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            <div 
              className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center text-purple-700 dark:text-purple-400 mb-1">
                <Heart className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Conversar</span>
              </div>
              <p className="text-sm text-purple-700/80 dark:text-purple-300/90">
                Dialogue com nossa assistente de saúde mental
              </p>
            </div>
            
            <div 
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center text-indigo-700 dark:text-indigo-400 mb-1">
                <BookOpen className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Aprender</span>
              </div>
              <p className="text-sm text-indigo-700/80 dark:text-indigo-300/90">
                Acesse vídeos e recursos educacionais
              </p>
            </div>
            
            <div 
              className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/20 rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center text-pink-700 dark:text-pink-400 mb-1">
                <BrainCircuit className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Módulos</span>
              </div>
              <p className="text-sm text-pink-700/80 dark:text-pink-300/90">
                Explore módulos temáticos de saúde mental
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
