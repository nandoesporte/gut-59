
import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Lock, Unlock, Check, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { REWARDS } from "@/constants/rewards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  isRead?: boolean;
}

const themes = [
  { name: 'saúde', color: 'bg-teal-50 hover:bg-teal-100 border-teal-200' },
  { name: 'produtividade', color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
  { name: 'bem-estar', color: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200' },
  { name: 'curiosidades', color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' },
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
  const [isGenerating, setIsGenerating] = useState(false);
  const { addTransaction } = useWallet();

  useEffect(() => {
    loadTips();
  }, []);

  const loadTips = async () => {
    try {
      setIsLoading(true);
      const savedTips = localStorage.getItem('monthlyTips');
      const currentMonth = new Date().getMonth();
      const savedMonth = localStorage.getItem('tipsMonth');
      const readTips = JSON.parse(localStorage.getItem('readTips') || '[]');

      if (!savedTips || savedMonth !== currentMonth.toString()) {
        await fetchTipsFromDB();
      } else {
        const savedTipsData = JSON.parse(savedTips);
        const updatedTips = savedTipsData.map((tip: Tip) => ({
          ...tip,
          isUnlocked: tip.id <= getCurrentDay(),
          isRead: readTips.includes(tip.id)
        }));
        setTips(updatedTips);
      }
    } catch (error) {
      console.error('Erro ao carregar dicas:', error);
      toast.error('Erro ao carregar as dicas do dia');
      
      const fallbackTips = defaultTips.map((tip, index) => ({
        ...tip,
        isUnlocked: index + 1 <= getCurrentDay(),
        isRead: false
      }));
      setTips(fallbackTips);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentDay = () => {
    return new Date().getDate();
  };

  const fetchTipsFromDB = async () => {
    const { data, error } = await supabase
      .from('daily_tips')
      .select('*');

    if (error) throw error;

    const tipsData = (data as DailyTip[]) || defaultTips;
    const currentDay = getCurrentDay();
    const readTips = JSON.parse(localStorage.getItem('readTips') || '[]');
    const currentMonth = new Date().getMonth();

    const newTips = Array.from({ length: 30 }, (_, index) => {
      const tipData = tipsData[index % tipsData.length];
      return {
        id: index + 1,
        content: tipData?.content || `Dica do dia ${index + 1}`,
        isUnlocked: index + 1 <= currentDay,
        theme: tipData?.theme || themes[Math.floor(Math.random() * themes.length)].name,
        isRead: readTips.includes(index + 1)
      };
    });

    localStorage.setItem('monthlyTips', JSON.stringify(newTips));
    localStorage.setItem('tipsMonth', currentMonth.toString());
    setTips(newTips);
  };

  const generateNewChallenges = async () => {
    try {
      setIsGenerating(true);
      toast.loading('Gerando novos desafios diários...');
      
      const response = await supabase.functions.invoke('generate-daily-challenges', {
        body: { count: 30 }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (response.data?.challenges) {
        localStorage.removeItem('monthlyTips');
        localStorage.removeItem('tipsMonth');
        
        await loadTips();
        
        toast.success('Novos desafios gerados com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao gerar novos desafios:', error);
      toast.error('Erro ao gerar novos desafios diários');
    } finally {
      setIsGenerating(false);
    }
  };

  const markTipAsRead = async (tipId: number) => {
    try {
      const readTips = JSON.parse(localStorage.getItem('readTips') || '[]');
      if (!readTips.includes(tipId)) {
        readTips.push(tipId);
        localStorage.setItem('readTips', JSON.stringify(readTips));
        
        setTips(tips.map(tip => 
          tip.id === tipId ? { ...tip, isRead: true } : tip
        ));

        await addTransaction({
          amount: REWARDS.DAILY_TIP,
          type: 'daily_tip',
          description: `Dica do dia ${tipId} concluída`
        });
        
        toast.success(`Desafio concluído! +${REWARDS.DAILY_TIP} FITs`);
      }
      setSelectedTip(null);
    } catch (error) {
      console.error('Erro ao marcar dica como lida:', error);
      toast.error('Erro ao registrar conclusão do desafio');
    }
  };

  const handleTipClick = (tip: Tip) => {
    if (tip.isUnlocked) {
      setSelectedTip(tip);
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
    <div className="w-full px-6 py-6 bg-gradient-to-br from-teal-50 to-white rounded-lg shadow-md border border-teal-100">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2.5 rounded-full">
            <Check className="w-5 h-5 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-teal-800">
            Desafio Diário
          </h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={generateNewChallenges}
          disabled={isGenerating}
          className="flex items-center gap-1.5 bg-white hover:bg-teal-50 border-teal-200 text-teal-700"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-10 gap-2.5">
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
                transition-all duration-300 cursor-pointer overflow-hidden group border-2
                ${tip.isUnlocked ? 'shadow-sm hover:shadow-md' : 'opacity-75'}`}
            >
              <div className="absolute inset-0 p-2 flex flex-col items-center justify-center">
                <span className="text-xs font-semibold mb-1 text-slate-700">Dia {tip.id}</span>
                {!tip.isUnlocked ? (
                  <Lock className="w-4 h-4 text-slate-500" />
                ) : tip.isRead ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Unlock className="w-4 h-4 text-teal-600" />
                )}
                {tip.isUnlocked && !tip.isRead && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/95 to-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 flex items-center justify-center">
                    <p className="text-xs font-medium text-teal-700">
                      Ver desafio
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!selectedTip} onOpenChange={() => setSelectedTip(null)}>
        <DialogContent className="sm:max-w-md border-teal-200 bg-gradient-to-br from-teal-50/80 to-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800">
              <span className="text-lg">
                Desafio do Dia {selectedTip?.id}
              </span>
              <span className="text-sm text-teal-600 italic">
                ({selectedTip?.theme})
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-white/80 rounded-lg border border-teal-100">
            <p className="text-slate-700 leading-relaxed">
              {selectedTip?.content}
            </p>
          </div>
          <DialogFooter className="sm:justify-between">
            <span className="text-sm text-slate-500">
              {selectedTip?.isRead ? 'Desafio já concluído' : 'Marque como concluído após ler'}
            </span>
            <Button
              onClick={() => selectedTip && markTipAsRead(selectedTip.id)}
              disabled={selectedTip?.isRead}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              {selectedTip?.isRead ? 'Concluído' : 'Confirmar Leitura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const getThemeColor = (theme: string) => {
  return themes.find(t => t.name === theme)?.color || themes[0].color;
};

export default TipsCalendar;
