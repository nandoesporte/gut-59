
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
        return <Meh className="h-5 w-5 text-amber-500" />;
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
      case 'happy': return 'bg-green-50';
      case 'good': return 'bg-blue-50';
      case 'neutral': return 'bg-amber-50';
      case 'sad': return 'bg-pink-50';
      case 'angry': return 'bg-orange-50';
      default: return 'bg-gray-50';
    }
  };

  return (
    <Card className="w-full border-none shadow-sm overflow-hidden bg-white">
      <CardContent className="p-4">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-violet-100 p-2 rounded-full">
                <BrainCircuit className="h-5 w-5 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-violet-800">Saúde Mental</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleNavigate('/mental')}
              className="bg-white hover:bg-violet-50 border-violet-200 text-violet-700 text-xs px-3 py-1 h-auto"
            >
              Acessar <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          
          <p className="text-sm text-violet-600/80 mb-2 -mt-1">
            Cuide da sua mente
          </p>

          {latestEmotion && (
            <div className={`${getEmotionBgColor(latestEmotion.emotion)} rounded-lg p-3 mb-3 flex justify-between items-center`}>
              <div className="flex items-center gap-2">
                {getEmotionIcon(latestEmotion.emotion)}
                <div className="flex flex-col">
                  <p className="text-xs text-gray-600 leading-tight">Seu humor hoje</p>
                  <p className="text-sm font-semibold leading-tight">{getEmotionLabel(latestEmotion.emotion)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {format(latestEmotion.date, "dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div 
              className="bg-violet-50 rounded-lg p-2 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center justify-center text-violet-600 mb-1">
                <Heart className="h-4 w-4" />
              </div>
              <p className="text-xs text-center text-violet-700">Conversar</p>
            </div>
            
            <div 
              className="bg-indigo-50 rounded-lg p-2 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center justify-center text-indigo-600 mb-1">
                <BookOpen className="h-4 w-4" />
              </div>
              <p className="text-xs text-center text-indigo-700">Aprender</p>
            </div>
            
            <div 
              className="bg-purple-50 rounded-lg p-2 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => handleNavigate('/mental')}
            >
              <div className="flex items-center justify-center text-purple-600 mb-1">
                <BrainCircuit className="h-4 w-4" />
              </div>
              <p className="text-xs text-center text-purple-700">Módulos</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
