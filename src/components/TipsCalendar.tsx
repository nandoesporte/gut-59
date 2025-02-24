
import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Lock, Unlock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DailyTip {
  id: number;
  content: string;
  theme: string;
  created_at: string;
}

interface Tip {
  id: number;
  content: string;
  isUnlocked: boolean;
  theme: string;
}

const themes = [
  { name: 'saúde', color: 'bg-rose-100 hover:bg-rose-200' },
  { name: 'produtividade', color: 'bg-blue-100 hover:bg-blue-200' },
  { name: 'bem-estar', color: 'bg-green-100 hover:bg-green-200' },
  { name: 'curiosidades', color: 'bg-purple-100 hover:bg-purple-200' },
];

const defaultTips = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  content: `Dica do dia ${i + 1}`,
  theme: themes[Math.floor(Math.random() * themes.length)].name
}));

const TipsCalendar = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTips = async () => {
      try {
        // Tenta carregar do localStorage primeiro
        const savedTips = localStorage.getItem('monthlyTips');
        const currentMonth = new Date().getMonth();
        const savedMonth = localStorage.getItem('tipsMonth');

        // Se não houver dicas salvas ou for um novo mês, gera novas dicas
        if (!savedTips || savedMonth !== currentMonth.toString()) {
          const { data, error } = await supabase
            .from('daily_tips')
            .select('*');

          if (error) throw error;

          const tipsData = (data as DailyTip[]) || defaultTips;
          const currentDay = new Date().getDate();

          const newTips = Array.from({ length: 30 }, (_, index) => {
            const tipData = tipsData[index % tipsData.length];
            return {
              id: index + 1,
              content: tipData?.content || `Dica do dia ${index + 1}`,
              isUnlocked: index + 1 <= currentDay,
              theme: tipData?.theme || themes[Math.floor(Math.random() * themes.length)].name
            };
          });

          localStorage.setItem('monthlyTips', JSON.stringify(newTips));
          localStorage.setItem('tipsMonth', currentMonth.toString());
          setTips(newTips);
        } else {
          setTips(JSON.parse(savedTips));
        }
      } catch (error) {
        console.error('Erro ao carregar dicas:', error);
        toast.error('Erro ao carregar as dicas do dia');
        
        // Fallback para dicas padrão em caso de erro
        const currentDay = new Date().getDate();
        const fallbackTips = defaultTips.map((tip, index) => ({
          ...tip,
          isUnlocked: index + 1 <= currentDay
        }));
        setTips(fallbackTips);
      } finally {
        setIsLoading(false);
      }
    };

    loadTips();
  }, []);

  useEffect(() => {
    // Atualiza o localStorage sempre que as dicas mudarem
    if (tips.length > 0) {
      localStorage.setItem('monthlyTips', JSON.stringify(tips));
    }
  }, [tips]);

  const getThemeColor = (theme: string) => {
    return themes.find(t => t.name === theme)?.color || themes[0].color;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        Dicas Diárias do Mês
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tips.map((tip) => (
          <motion.div
            key={tip.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              className={`relative h-32 sm:h-40 ${getThemeColor(tip.theme)} 
                transition-all duration-300 cursor-pointer overflow-hidden
                ${tip.isUnlocked ? 'shadow-lg' : 'opacity-80 shadow'}`}
            >
              <div className="absolute inset-0 p-3 flex flex-col">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold">
                    Dia {tip.id}
                  </span>
                  {!tip.isUnlocked && (
                    <Lock className="w-4 h-4 text-gray-600" />
                  )}
                  {tip.isUnlocked && (
                    <Unlock className="w-4 h-4 text-green-600" />
                  )}
                </div>
                {tip.isUnlocked ? (
                  <p className="mt-2 text-sm leading-tight text-gray-700">
                    {tip.content}
                  </p>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500">
                      Disponível dia {tip.id}
                    </p>
                  </div>
                )}
                <span className="absolute bottom-2 right-2 text-xs text-gray-500 italic">
                  {tip.theme}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TipsCalendar;
