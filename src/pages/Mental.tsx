
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Clock, Headphones, BookOpen, MessageCircle, Smile, SmilePlus, Frown, Meh, Angry } from "lucide-react";

const Mental = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [mood, setMood] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [isBreathing, setIsBreathing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [breathingPhase, setBreathingPhase] = useState('');

  const emotions = [
    { id: 'happy', icon: <SmilePlus className="w-6 h-6 md:w-8 md:h-8" />, label: 'Muito Feliz', color: 'bg-[#F2FCE2]' },
    { id: 'good', icon: <Smile className="w-6 h-6 md:w-8 md:h-8" />, label: 'Bem', color: 'bg-[#D3E4FD]' },
    { id: 'neutral', icon: <Meh className="w-6 h-6 md:w-8 md:h-8" />, label: 'Neutro', color: 'bg-[#FEF7CD]' },
    { id: 'sad', icon: <Frown className="w-6 h-6 md:w-8 md:h-8" />, label: 'Triste', color: 'bg-[#FFDEE2]' },
    { id: 'angry', icon: <Angry className="w-6 h-6 md:w-8 md:h-8" />, label: 'Irritado', color: 'bg-[#FEC6A1]' },
  ];

  const startBreathing = () => {
    setIsBreathing(true);
    let totalSeconds = 0;
    
    const interval = setInterval(() => {
      totalSeconds++;
      setSeconds(totalSeconds);
      
      // 4-7-8 Breathing pattern
      const cycle = totalSeconds % 19;
      if (cycle < 4) {
        setBreathingPhase('Inspire');
      } else if (cycle < 11) {
        setBreathingPhase('Segure');
      } else {
        setBreathingPhase('Expire');
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      setIsBreathing(false);
      setSeconds(0);
      setBreathingPhase('');
    }, 300000);

    return () => clearInterval(interval);
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8 animate-fadeIn pb-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-primary mb-4 sm:mb-8">Saúde Mental</h1>

      <Tabs defaultValue="breathing" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto">
          <TabsTrigger value="breathing" className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            Respiração
          </TabsTrigger>
          <TabsTrigger value="meditation" className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm">
            <Headphones className="h-3 w-3 sm:h-4 sm:w-4" />
            Meditação
          </TabsTrigger>
          <TabsTrigger value="diary" className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm">
            <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
            Diário
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm">
            <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            IA
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            Recursos
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 space-y-4">
          <TabsContent value="breathing">
            <Card className="bg-gradient-to-br from-[#E6F8FC] to-[#F6F9FE]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg sm:text-xl text-primary">Respiração 4-7-8</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-4 sm:p-8 min-h-[350px] sm:min-h-[400px]">
                {!isBreathing ? (
                  <div className="w-full max-w-md space-y-4">
                    <p className="text-sm text-center text-muted-foreground mb-6">
                      Uma técnica simples e eficaz para reduzir ansiedade e melhorar o foco
                    </p>
                    <Button 
                      onClick={startBreathing} 
                      size="lg" 
                      className="w-full bg-primary hover:bg-primary/90 shadow-lg"
                    >
                      Iniciar Exercício
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-6">
                    <div 
                      className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg
                        ${breathingPhase === 'Inspire' ? 'animate-scale-in bg-[#D3E4FD]' : 
                          breathingPhase === 'Segure' ? 'bg-[#F2FCE2]' : 'animate-scale-out bg-[#FFDEE2]'}`}
                    >
                      <span className="text-xl sm:text-2xl font-bold text-primary">{breathingPhase}</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-semibold text-primary">
                      {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-sm sm:text-base text-muted-foreground text-center">
                      {breathingPhase === 'Inspire' ? '4 segundos' : 
                       breathingPhase === 'Segure' ? '7 segundos' : '8 segundos'}
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

                <div className="bg-card rounded-lg p-2 sm:p-4 shadow-sm">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-lg"
                    classNames={{
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary/90",
                      day_today: "bg-accent text-accent-foreground",
                      day: "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-full transition-colors",
                      cell: "text-center p-0",
                      head_cell: "text-muted-foreground font-normal text-xs sm:text-sm",
                      nav_button: "hover:bg-accent rounded-full transition-colors",
                      table: "w-full border-collapse space-y-1",
                    }}
                  />
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
                <CardTitle className="text-lg sm:text-xl text-primary">Recursos Úteis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
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
                
                <Card className="p-4 bg-[#F6F9FE]">
                  <h3 className="font-semibold text-primary mb-3">Artigos Recomendados</h3>
                  <ul className="space-y-2">
                    {[
                      'Como lidar com a ansiedade',
                      'Técnicas de mindfulness',
                      'Melhorando a qualidade do sono'
                    ].map((title, index) => (
                      <li 
                        key={index}
                        className="text-sm text-primary hover:text-primary/80 cursor-pointer transition-colors flex items-center gap-2"
                      >
                        <BookOpen className="w-4 h-4" />
                        {title}
                      </li>
                    ))}
                  </ul>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Mental;
