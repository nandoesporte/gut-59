
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Brain, Headphones, BookOpen, MessageCircle, Smile, SmilePlus, Frown, Meh, Angry, Loader2, CalendarIcon, ArrowUpDown } from "lucide-react";
import { MentalHealthResources } from '@/components/mental/MentalHealthResources';
import { MentalModules } from '@/components/mental/MentalModules';
import { MentalHealthChat } from '@/components/mental/MentalHealthChat';
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface EmotionLog {
  id?: string;
  date: Date;
  emotion: string;
  user_id?: string;
}

const Mental = () => {
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [activeTab, setActiveTab] = useState('breathing');
  const [emotionGuidance, setEmotionGuidance] = useState('');
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const [emotionHistory, setEmotionHistory] = useState<EmotionLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    fetchEmotionHistory();
  }, []);

  const menuItems = [
    { id: 'breathing', icon: <ArrowUpDown className="w-6 h-6" />, label: 'Respiração', color: 'bg-[#D3E4FD]' },
    { id: 'meditation', icon: <Headphones className="w-6 h-6" />, label: 'Meditação', color: 'bg-[#F2FCE2]' },
    { id: 'diary', icon: <Brain className="w-6 h-6" />, label: 'Diário', color: 'bg-[#FEF7CD]' },
    { id: 'ai', icon: <MessageCircle className="w-6 h-6" />, label: 'IA Conselheira', color: 'bg-[#FFDEE2]' },
    { id: 'resources', icon: <BookOpen className="w-6 h-6" />, label: 'Recursos', color: 'bg-[#FEC6A1]' },
  ];

  const emotions = [
    { id: 'happy', icon: <SmilePlus className="w-6 h-6 md:w-8 md:h-8" />, label: 'Muito Feliz', color: 'bg-[#F2FCE2]' },
    { id: 'good', icon: <Smile className="w-6 h-6 md:w-8 md:h-8" />, label: 'Bem', color: 'bg-[#D3E4FD]' },
    { id: 'neutral', icon: <Meh className="w-6 h-6 md:w-8 md:h-8" />, label: 'Neutro', color: 'bg-[#FEF7CD]' },
    { id: 'sad', icon: <Frown className="w-6 h-6 md:w-8 md:h-8" />, label: 'Triste', color: 'bg-[#FFDEE2]' },
    { id: 'angry', icon: <Angry className="w-6 h-6 md:w-8 md:h-8" />, label: 'Irritado', color: 'bg-[#FEC6A1]' },
  ];

  const fetchEmotionHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('emotion_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (error) throw error;
        
        const formattedData: EmotionLog[] = data?.map(item => ({
          id: item.id,
          date: new Date(item.created_at),
          emotion: item.emotion,
          user_id: item.user_id
        })) || [];
        
        setEmotionHistory(formattedData);
      } else {
        console.log("Usuário não autenticado, histórico será armazenado apenas na sessão");
      }
    } catch (error) {
      console.error("Erro ao buscar histórico de emoções:", error);
      toast.error("Não foi possível carregar seu histórico de emoções");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getEmotionGuidance = async (emotion: string) => {
    setIsLoadingGuidance(true);
    setEmotionGuidance('');
    
    try {
      const emotionLabel = emotions.find(e => e.id === emotion)?.label || '';
      
      const { data, error } = await supabase.functions.invoke("groq-chat", {
        body: { 
          message: `Dê um breve conselho ou orientação para alguém que está se sentindo ${emotionLabel.toLowerCase()} hoje. Não mais que 2 parágrafos.`,
          history: [
            {
              role: "assistant",
              content: "Olá! Estou aqui para te ajudar com orientações sobre suas emoções."
            }
          ],
          model: "llama3-8b-8192"
        },
      });

      if (error) throw error;

      if (data?.response) {
        setEmotionGuidance(data.response);
      } else {
        throw new Error("Resposta não recebida");
      }
    } catch (error) {
      console.error("Erro ao obter orientação:", error);
      setEmotionGuidance("Não foi possível carregar uma orientação para essa emoção. Tente novamente mais tarde.");
    } finally {
      setIsLoadingGuidance(false);
    }
  };

  const handleEmotionSelect = async (emotion: string) => {
    setSelectedEmotion(emotion);
    getEmotionGuidance(emotion);
    
    const newEntry: EmotionLog = {
      date: new Date(),
      emotion: emotion
    };
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('emotion_logs')
          .insert({
            emotion: emotion,
            user_id: user.id
          });
          
        if (error) throw error;
        
        fetchEmotionHistory();
      } else {
        setEmotionHistory(prev => [newEntry, ...prev].slice(0, 10));
      }
    } catch (error) {
      console.error("Erro ao salvar emoção:", error);
      toast.error("Não foi possível salvar sua emoção. Tente novamente mais tarde.");
      
      setEmotionHistory(prev => [newEntry, ...prev].slice(0, 10));
    }
  };

  const getEmotionLabel = (emotionId: string) => {
    return emotions.find(e => e.id === emotionId)?.label || '';
  };
  
  const getEmotionColor = (emotionId: string) => {
    return emotions.find(e => e.id === emotionId)?.color || '';
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8 animate-fadeIn pb-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-primary mb-6">Saúde Mental</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`${item.color} p-4 rounded-xl transition-all duration-300 ${
              activeTab === item.id 
                ? 'ring-2 ring-primary shadow-lg scale-105' 
                : 'hover:scale-105 hover:shadow-md'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              {item.icon}
              <span className="text-xs sm:text-sm font-medium text-center">{item.label}</span>
            </div>
          </button>
        ))}
      </div>

      <Tabs value={activeTab} className="w-full">
        <TabsContent value="breathing">
          <MentalHealthResources />
        </TabsContent>
        
        <TabsContent value="meditation">
          <Card className="bg-gradient-to-br from-[#FEF9F9] to-[#F8F8FF]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl text-primary">Meditação Guiada</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4">
              {[
                { title: 'Redução de Ansiedade', duration: '10 min', gradient: 'from-[#D3E4FD] to-[#E8F0FB]' },
                { title: 'Melhora do Sono', duration: '15 min', gradient: 'from-[#F2FCE2] to-[#E8F4E0]' },
                { title: 'Foco e Concentração', duration: '12 min', gradient: 'from-[#FEF7CD] to-[#FDF9E6]' }
              ].map((session, index) => (
                <Card key={index} className={`bg-gradient-to-r ${session.gradient} p-4 cursor-pointer hover:shadow-md transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-primary">{session.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{session.duration}</p>
                    </div>
                    <Headphones className="w-5 h-5 text-primary opacity-70" />
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diary">
          <Card className="bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl text-primary">Diário de Emoções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-4">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
                {emotions.map((emotion) => (
                  <button
                    key={emotion.id}
                    onClick={() => handleEmotionSelect(emotion.id)}
                    className={`p-3 sm:p-4 rounded-xl transition-all transform hover:scale-105 ${emotion.color} 
                      ${selectedEmotion === emotion.id ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {emotion.icon}
                      <span className="text-xs sm:text-sm font-medium text-center">{emotion.label}</span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedEmotion && (
                <Alert className={`${emotions.find(e => e.id === selectedEmotion)?.color} border-none`}>
                  <AlertDescription className="py-2">
                    {isLoadingGuidance ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Carregando orientação...</span>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{emotionGuidance}</div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-card rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" /> 
                  Histórico de Emoções
                </h3>
                
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Carregando histórico...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emotionHistory.length > 0 ? (
                      emotionHistory.map((entry, index) => (
                        <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${getEmotionColor(entry.emotion)}`}>
                          <div className="flex items-center gap-2">
                            {emotions.find(e => e.id === entry.emotion)?.icon}
                            <span className="font-medium">{getEmotionLabel(entry.emotion)}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(entry.date, "dd 'de' MMMM", { locale: ptBR })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-4">
                        Seu histórico de emoções aparecerá aqui. Selecione uma emoção acima para registrar como você se sente hoje.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="bg-gradient-to-br from-[#F8F9FA] to-[#FFFFFF]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl text-primary">IA Conselheira</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[500px]">
                <MentalHealthChat />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <MentalModules />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Mental;
