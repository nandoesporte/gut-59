
import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Lock, Unlock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWallet } from "@/hooks/useWallet";

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
  { name: 'saúde', color: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200' },
  { name: 'produtividade', color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
  { name: 'bem-estar', color: 'bg-teal-50 hover:bg-teal-100 border-teal-200' },
  { name: 'curiosidades', color: 'bg-slate-50 hover:bg-slate-100 border-slate-200' },
];

const defaultTips = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  content: `Dica do dia ${i + 1}`,
  theme: themes[Math.floor(Math.random() * themes.length)].name
}));

const TipsCalendar = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);
  const { addTransaction } = useWallet();

  useEffect(() => {
    const loadTips = async () => {
      try {
        const savedTips = localStorage.getItem('monthlyTips');
        const currentMonth = new Date().getMonth();
        const savedMonth = localStorage.getItem('tipsMonth');

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
    if (tips.length > 0) {
      localStorage.setItem('monthlyTips', JSON.stringify(tips));
    }
  }, [tips]);

  const getThemeColor = (theme: string) => {
    return themes.find(t => t.name === theme)?.color || themes[0].color;
  };

  const handleTipClick = (tip: Tip) => {
    if (tip.isUnlocked) {
      setSelectedTip(tip);
      addTransaction({
        amount: 1,
        type: 'daily_tip',
        description: `Desafio do dia ${tip.id}`
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 bg-gradient-to-br from-slate-50 to-white rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-center mb-6 text-primary-500">
        Atividades Diárias
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
              onClick={() => handleTipClick(tip)}
              className={`relative w-full aspect-square ${getThemeColor(tip.theme)} 
                transition-all duration-300 cursor-pointer overflow-hidden group border
                ${tip.isUnlocked ? 'shadow-sm hover:shadow-md' : 'opacity-80'}`}
            >
              <div className="absolute inset-0 p-2 flex flex-col items-center justify-center">
                <span className="text-xs font-semibold mb-1 text-slate-700">Dia {tip.id}</span>
                {!tip.isUnlocked ? (
                  <Lock className="w-4 h-4 text-slate-500" />
                ) : (
                  <Unlock className="w-4 h-4 text-teal-600" />
                )}
                {tip.isUnlocked && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-white/95 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 flex items-center justify-center">
                    <p className="text-xs font-medium text-slate-600">
                      Clique para ver o desafio
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!selectedTip} onOpenChange={() => setSelectedTip(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg text-slate-800">
                Desafio do Dia {selectedTip?.id}
              </span>
              <span className="text-sm text-slate-500 italic">
                ({selectedTip?.theme})
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-lg border border-slate-200">
            <p className="text-slate-700 leading-relaxed">
              {selectedTip?.content}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TipsCalendar;
