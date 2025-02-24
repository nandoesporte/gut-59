
import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Lock, Unlock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DailyTip {
  id: number;
  content: string;
  theme: string | null;
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
    <div className="w-full px-4 py-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        Dicas Diárias do Mês
      </h2>
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-10 gap-2">
        {tips.map((tip) => (
          <motion.div
            key={tip.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              className={`relative w-full aspect-square ${getThemeColor(tip.theme)} 
                transition-all duration-300 cursor-pointer overflow-hidden group
                ${tip.isUnlocked ? 'shadow-md hover:shadow-lg' : 'opacity-80 shadow'}`}
            >
              <div className="absolute inset-0 p-2 flex flex-col items-center justify-center">
                <span className="text-xs font-semibold mb-1">{tip.id}</span>
                {!tip.isUnlocked ? (
                  <Lock className="w-4 h-4 text-gray-600" />
                ) : (
                  <Unlock className="w-4 h-4 text-green-600" />
                )}
                {tip.isUnlocked && (
                  <div className="absolute inset-0 bg-white/95 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 flex items-center justify-center">
                    <p className="text-xs leading-tight text-gray-700 text-center">
                      {tip.content}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TipsCalendar;
