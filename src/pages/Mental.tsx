
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from "@/components/ui/progress";
import { Brain, Clock, Headphones, BookOpen, MessageCircle, Smile, SmilePlus, Frown, Meh, Angry, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MentalHealthResources } from '@/components/mental/MentalHealthResources';

const BREATHING_PHASES = {
  INHALE: { duration: 4, label: 'Inspire' },
  HOLD: { duration: 7, label: 'Segure' },
  EXHALE: { duration: 8, label: 'Expire' },
};

const EXERCISE_DURATION = 60; // 1 minuto
const DAILY_REWARD_LIMIT = 5;

const Mental = () => {
  const [date] = useState<Date>(new Date());
  const [mood, setMood] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [isBreathing, setIsBreathing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [phaseSeconds, setPhaseSeconds] = useState(0);
  const [breathingPhase, setBreathingPhase] = useState('');
  const [activeTab, setActiveTab] = useState('breathing');
  const [completedExercises, setCompletedExercises] = useState(0);
  const [phaseCountdown, setPhaseCountdown] = useState(0);
  
  const { addTransaction } = useWallet();

  const getCurrentPhaseDuration = () => {
    switch (breathingPhase) {
      case BREATHING_PHASES.INHALE.label:
        return BREATHING_PHASES.INHALE.duration;
      case BREATHING_PHASES.HOLD.label:
        return BREATHING_PHASES.HOLD.duration;
      case BREATHING_PHASES.EXHALE.label:
        return BREATHING_PHASES.EXHALE.duration;
      default:
        return 0;
    }
  };

  useEffect(() => {
    checkDailyExercises();
  }, []);

  const checkDailyExercises = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('fit_transactions')
      .select('count')
      .eq('transaction_type', 'breathing_exercise')
      .gte('created_at', today.toISOString())
      .single();

    if (!error && data) {
      setCompletedExercises(data.count);
    }
  };

  const handleExerciseCompletion = async () => {
    if (completedExercises >= DAILY_REWARD_LIMIT) {
      toast.info('Você já atingiu o limite diário de recompensas para este exercício');
      return;
    }

    try {
      await addTransaction({
        amount: 1,
        type: 'breathing_exercise',
        description: 'Exercício de respiração completado'
      });
      
      setCompletedExercises(prev => prev + 1);
      toast.success('Parabéns! Você ganhou 1 FIT pelo exercício de respiração', {
        icon: <Coins className="w-4 h-4" />
      });
    } catch (error) {
      console.error('Erro ao adicionar recompensa:', error);
      toast.error('Erro ao adicionar recompensa');
    }
  };

  const startBreathing = () => {
    setIsBreathing(true);
    let totalSeconds = 0;
    let currentPhaseSeconds = 0;
    
    // Iniciar com a fase de inspiração
    setBreathingPhase(BREATHING_PHASES.INHALE.label);
    setPhaseCountdown(BREATHING_PHASES.INHALE.duration);
    
    const interval = setInterval(() => {
      if (totalSeconds >= EXERCISE_DURATION) {
        clearInterval(interval);
        setIsBreathing(false);
        setSeconds(0);
        setPhaseSeconds(0);
        setBreathingPhase('');
        setPhaseCountdown(0);
        handleExerciseCompletion();
        return;
      }

      totalSeconds++;
      currentPhaseSeconds++;
      setSeconds(totalSeconds);
      
      // Ciclo de 19 segundos (4+7+8)
      const cycle = totalSeconds % 19;
      
      if (cycle < BREATHING_PHASES.INHALE.duration) {
        if (breathingPhase !== BREATHING_PHASES.INHALE.label) {
          currentPhaseSeconds = 0;
          setBreathingPhase(BREATHING_PHASES.INHALE.label);
          setPhaseCountdown(BREATHING_PHASES.INHALE.duration);
        } else {
          setPhaseCountdown(BREATHING_PHASES.INHALE.duration - currentPhaseSeconds);
        }
      } else if (cycle < BREATHING_PHASES.INHALE.duration + BREATHING_PHASES.HOLD.duration) {
        if (breathingPhase !== BREATHING_PHASES.HOLD.label) {
          currentPhaseSeconds = 0;
          setBreathingPhase(BREATHING_PHASES.HOLD.label);
          setPhaseCountdown(BREATHING_PHASES.HOLD.duration);
        } else {
          setPhaseCountdown(BREATHING_PHASES.HOLD.duration - (currentPhaseSeconds - BREATHING_PHASES.INHALE.duration));
        }
      } else {
        if (breathingPhase !== BREATHING_PHASES.EXHALE.label) {
          currentPhaseSeconds = 0;
          setBreathingPhase(BREATHING_PHASES.EXHALE.label);
          setPhaseCountdown(BREATHING_PHASES.EXHALE.duration);
        } else {
          setPhaseCountdown(BREATHING_PHASES.EXHALE.duration - (currentPhaseSeconds - BREATHING_PHASES.INHALE.duration - BREATHING_PHASES.HOLD.duration));
        }
      }
      
      setPhaseSeconds(currentPhaseSeconds);
    }, 1000);

    return () => clearInterval(interval);
  };

  const getCurrentPhaseProgress = () => {
    const phaseDuration = getCurrentPhaseDuration();
    if (!phaseDuration) return 0;
    return ((phaseDuration - phaseCountdown) / phaseDuration) * 100;
  };

  const getOverallProgress = () => {
    return (seconds / EXERCISE_DURATION) * 100;
  };

  const menuItems = [
    { id: 'breathing', icon: <Clock className="w-6 h-6" />, label: 'Respiração', color: 'bg-[#D3E4FD]' },
    { id: 'meditation', icon: <Headphones className="w-6 h-6" />, label: 'Meditação', color: 'bg-[#F2FCE2]' },
    { id: 'diary', icon: <Brain className="w-6 h-6" />, label: 'Diário', color: 'bg-[#FEF7CD]' },
    { id: 'ai', icon: <MessageCircle className="w-6 h-6" />, label: 'IA', color: 'bg-[#FFDEE2]' },
    { id: 'resources', icon: <BookOpen className="w-6 h-6" />, label: 'Recursos', color: 'bg-[#FEC6A1]' },
  ];

  const emotions = [
    { id: 'happy', icon: <SmilePlus className="w-6 h-6 md:w-8 md:h-8" />, label: 'Muito Feliz', color: 'bg-[#F2FCE2]' },
    { id: 'good', icon: <Smile className="w-6 h-6 md:w-8 md:h-8" />, label: 'Bem', color: 'bg-[#D3E4FD]' },
    { id: 'neutral', icon: <Meh className="w-6 h-6 md:w-8 md:h-8" />, label: 'Neutro', color: 'bg-[#FEF7CD]' },
    { id: 'sad', icon: <Frown className="w-6 h-6 md:w-8 md:h-8" />, label: 'Triste', color: 'bg-[#FFDEE2]' },
    { id: 'angry', icon: <Angry className="w-6 h-6 md:w-8 md:h-8" />, label: 'Irritado', color: 'bg-[#FEC6A1]' },
  ];

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
          <Card className="bg-gradient-to-br from-[#E6F8FC] to-[#F6F9FE]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl text-primary">Respiração 4-7-8</CardTitle>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Exercícios completados hoje: {completedExercises}/{DAILY_REWARD_LIMIT}
                </p>
                <Badge variant="secondary">
                  <Coins className="w-4 h-4 mr-1" />
                  1 FIT por exercício
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-8 min-h-[350px] sm:min-h-[400px]">
              {!isBreathing ? (
                <div className="w-full max-w-md space-y-4">
                  <p className="text-sm text-center text-muted-foreground mb-6">
                    Complete 1 minuto de exercício para ganhar 1 FIT (limite de {DAILY_REWARD_LIMIT} por dia)
                  </p>
                  <Button 
                    onClick={startBreathing} 
                    size="lg" 
                    className="w-full bg-primary hover:bg-primary/90 shadow-lg"
                    disabled={completedExercises >= DAILY_REWARD_LIMIT}
                  >
                    {completedExercises >= DAILY_REWARD_LIMIT 
                      ? 'Limite diário atingido' 
                      : 'Iniciar Exercício'}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div 
                    className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-lg relative
                      ${breathingPhase === BREATHING_PHASES.INHALE.label ? 'animate-scale-in bg-[#D3E4FD]' : 
                        breathingPhase === BREATHING_PHASES.HOLD.label ? 'bg-[#F2FCE2]' : 'animate-scale-out bg-[#FFDEE2]'}`}
                  >
                    <span className="text-xl sm:text-2xl font-bold text-primary mb-2">{breathingPhase}</span>
                    <span className="text-3xl sm:text-4xl font-bold text-primary">
                      {phaseCountdown}
                    </span>
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        className="text-gray-200"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="transparent"
                        r="47%"
                        cx="50%"
                        cy="50%"
                      />
                      <circle
                        className="text-primary transition-all duration-500"
                        strokeWidth="4"
                        strokeDasharray={`${getCurrentPhaseProgress() * 2.95} 295`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="47%"
                        cx="50%"
                        cy="50%"
                      />
                    </svg>
                  </div>

                  <div className="w-full max-w-md space-y-4">
                    <div className="text-center text-sm text-muted-foreground">
                      Tempo total: {seconds}s / {EXERCISE_DURATION}s
                    </div>
                    <Progress value={getOverallProgress()} className="h-2" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
                    onClick={() => setSelectedEmotion(emotion.id)}
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

              <div className="bg-card rounded-lg p-4 shadow-sm">
                <div className="w-full max-w-md mx-auto">
                  <div className={`p-4 rounded-xl bg-[#F6F9FE] hover:bg-[#E6F8FC] transition-colors cursor-pointer shadow-sm`}>
                    <div className="text-center space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {format(date, 'EEEE', { locale: ptBR })}
                      </div>
                      <div className="text-2xl font-semibold text-primary">
                        {format(date, 'd', { locale: ptBR })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(date, 'MMMM yyyy', { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium block text-muted-foreground">Como você está se sentindo hoje?</label>
                <Textarea
                  placeholder="Escreva sobre suas emoções..."
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <Button className="w-full shadow-md">Salvar Registro</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="bg-gradient-to-br from-[#F8F9FA] to-[#FFFFFF]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl text-primary">IA Conselheira</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="rounded-lg bg-[#F6F9FE] p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Olá! Sou sua assistente de bem-estar mental. Como posso ajudar você hoje?
                </p>
              </div>
              <Textarea
                placeholder="Digite sua mensagem..."
                className="min-h-[100px] resize-none"
              />
              <Button className="w-full shadow-md">Enviar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card className="bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl text-primary">Recursos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-6">
                <Card className="p-4 bg-[#F6F9FE]">
                  <h3 className="font-semibold text-primary mb-3">Contatos de Emergência</h3>
                  <div className="space-y-2">
                    <p className="text-sm flex items-center gap-2">
                      <span className="font-medium">CVV:</span>
                      <span className="text-muted-foreground">188</span>
                    </p>
                    <p className="text-sm flex items-center gap-2">
                      <span className="font-medium">SAMU:</span>
                      <span className="text-muted-foreground">192</span>
                    </p>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-semibold text-primary mb-4">Conteúdo Educativo</h3>
                  <MentalHealthResources />
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Mental;
