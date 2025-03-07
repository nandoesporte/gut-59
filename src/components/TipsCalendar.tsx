
import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Lock, Unlock, Check } from "lucide-react";
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
  const [isFetchingTip, setIsFetchingTip] = useState(false);
  
  useEffect(() => {
    const loadTips = async () => {
      try {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();
        const currentYear = today.getFullYear();
        
        const savedTips = localStorage.getItem('monthlyTips');
        const savedMonth = localStorage.getItem('tipsMonth');
        const savedYear = localStorage.getItem('tipsYear');
        const readTips = JSON.parse(localStorage.getItem('readTips') || '[]');

        // If it's a new month/year or we don't have saved tips, fetch new ones
        if (!savedTips || 
            savedMonth !== currentMonth.toString() || 
            savedYear !== currentYear.toString()) {
          
          console.log("Fetching new tips for month:", currentMonth + 1, "year:", currentYear);
          
          const { data, error } = await supabase
            .from('daily_tips')
            .select('*');

          if (error) throw error;

          const tipsData = (data as DailyTip[]) || defaultTips;
          
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
          localStorage.setItem('tipsYear', currentYear.toString());
          setTips(newTips);
        } else {
          // Update unlocked status based on current day
          const savedTipsData = JSON.parse(savedTips);
          const updatedTips = savedTipsData.map((tip: Tip, index: number) => ({
            ...tip,
            isUnlocked: index + 1 <= currentDay,
            isRead: readTips.includes(tip.id)
          }));
          setTips(updatedTips);
        }
      } catch (error) {
        console.error('Erro ao carregar dicas:', error);
        toast.error('Erro ao carregar as dicas do dia');
        
        const currentDay = new Date().getDate();
        const fallbackTips = defaultTips.map((tip, index) => ({
          ...tip,
          isUnlocked: index + 1 <= currentDay,
          isRead: false
        }));
        setTips(fallbackTips);
      } finally {
        setIsLoading(false);
      }
    };

    loadTips();
  }, []);

  const generateTipWithLlama = async (tipId: number, theme: string): Promise<string> => {
    setIsFetchingTip(true);
    try {
      const prompt = `Por favor, gere uma dica diária curta e motivacional sobre ${theme}. 
      A dica deve ser prática, inspiradora e fácil de aplicar no dia a dia.
      Responda em Português, com no máximo 3 frases.`;
      
      const response = await supabase.functions.invoke('llama-completion', {
        body: { prompt, max_tokens: 500, temperature: 0.7 }
      });
      
      if (response.error) {
        throw new Error(`Erro ao gerar dica: ${response.error.message}`);
      }
      
      const result = response.data?.completion || '';
      console.log(`Generated tip for day ${tipId}:`, result);
      
      // Clean up the result - remove quotation marks, code blocks, etc.
      const cleanedResult = result
        .replace(/```[a-z]*\n|```/g, '') // Remove code block markers
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .trim();
      
      return cleanedResult || `Dica do dia ${tipId} sobre ${theme}`;
    } catch (error) {
      console.error('Erro ao gerar dica com modelo Llama:', error);
      return `Dica do dia ${tipId} sobre ${theme}: Pratique hábitos saudáveis diariamente.`;
    } finally {
      setIsFetchingTip(false);
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
        
        toast.success(`Dica concluída! +${REWARDS.DAILY_TIP} FITs`);
      }
      setSelectedTip(null);
    } catch (error) {
      console.error('Erro ao marcar dica como lida:', error);
      toast.error('Erro ao registrar conclusão da dica');
    }
  };

  const handleTipClick = async (tip: Tip) => {
    if (tip.isUnlocked) {
      // For unread tips, generate content with Llama model when opened
      if (!tip.isRead) {
        const storedTipContent = JSON.parse(localStorage.getItem('monthlyTips') || '[]')
          .find((t: Tip) => t.id === tip.id)?.content;
        
        // Check if content is just the default placeholder
        const isDefaultTip = storedTipContent === `Dica do dia ${tip.id}` || !storedTipContent;
        
        if (isDefaultTip) {
          const generatedContent = await generateTipWithLlama(tip.id, tip.theme);
          const updatedTip = { ...tip, content: generatedContent };
          
          // Update the tip in the state and localStorage
          setTips(tips.map(t => t.id === tip.id ? updatedTip : t));
          
          const updatedTips = JSON.parse(localStorage.getItem('monthlyTips') || '[]')
            .map((t: Tip) => t.id === tip.id ? { ...t, content: generatedContent } : t);
          
          localStorage.setItem('monthlyTips', JSON.stringify(updatedTips));
          setSelectedTip(updatedTip);
        } else {
          setSelectedTip(tip);
        }
      } else {
        setSelectedTip(tip);
      }
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
                ) : tip.isRead ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Unlock className="w-4 h-4 text-teal-600" />
                )}
                {tip.isUnlocked && !tip.isRead && (
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
            {isFetchingTip ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <p className="text-slate-700 leading-relaxed">
                {selectedTip?.content}
              </p>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <span className="text-sm text-slate-500">
              {selectedTip?.isRead ? 'Atividade já concluída' : 'Marque como concluído após ler'}
            </span>
            <Button
              onClick={() => selectedTip && markTipAsRead(selectedTip.id)}
              disabled={selectedTip?.isRead || isFetchingTip}
              className="bg-green-500 hover:bg-green-600"
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
