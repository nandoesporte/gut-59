
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
    { id: 'happy', icon: <SmilePlus className="w-8 h-8" />, label: 'Muito Feliz', color: 'bg-[#F2FCE2]' },
    { id: 'good', icon: <Smile className="w-8 h-8" />, label: 'Bem', color: 'bg-[#D3E4FD]' },
    { id: 'neutral', icon: <Meh className="w-8 h-8" />, label: 'Neutro', color: 'bg-[#FEF7CD]' },
    { id: 'sad', icon: <Frown className="w-8 h-8" />, label: 'Triste', color: 'bg-[#FFDEE2]' },
    { id: 'angry', icon: <Angry className="w-8 h-8" />, label: 'Irritado', color: 'bg-[#FEC6A1]' },
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
    <div className="container mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      <h1 className="text-3xl font-bold text-center text-primary mb-8">Saúde Mental</h1>

      <Tabs defaultValue="breathing" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2 mb-6">
          <TabsTrigger value="breathing" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Respiração
          </TabsTrigger>
          <TabsTrigger value="meditation" className="flex items-center gap-2">
            <Headphones className="h-4 w-4" />
            Meditação
          </TabsTrigger>
          <TabsTrigger value="diary" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Diário
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            IA Conselheira
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Recursos
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          <TabsContent value="breathing">
            <Card>
              <CardHeader>
                <CardTitle>Técnicas de Respiração</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center min-h-[400px] justify-center p-8">
                {!isBreathing ? (
                  <div className="w-full max-w-md">
                    <Button 
                      onClick={startBreathing} 
                      size="lg" 
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      Iniciar Exercício 4-7-8
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-8">
                    <div 
                      className={`w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center transition-all duration-500
                        ${breathingPhase === 'Inspire' ? 'animate-scale-in bg-[#D3E4FD]' : 
                          breathingPhase === 'Segure' ? 'bg-[#F2FCE2]' : 'animate-scale-out bg-[#FFDEE2]'}`}
                    >
                      <span className="text-2xl font-bold text-primary">{breathingPhase}</span>
                    </div>
                    <div className="text-2xl font-semibold">
                      {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-lg text-muted-foreground text-center">
                      {breathingPhase === 'Inspire' ? '4 segundos' : 
                       breathingPhase === 'Segure' ? '7 segundos' : '8 segundos'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meditation">
            <Card>
              <CardHeader>
                <CardTitle>Meditação Guiada</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 p-6">
                <Card className="p-6 cursor-pointer hover:bg-accent transition-colors">
                  <h3 className="font-semibold">Redução de Ansiedade</h3>
                  <p className="text-sm text-muted-foreground mt-2">10 minutos</p>
                </Card>
                <Card className="p-6 cursor-pointer hover:bg-accent transition-colors">
                  <h3 className="font-semibold">Melhora do Sono</h3>
                  <p className="text-sm text-muted-foreground mt-2">15 minutos</p>
                </Card>
                <Card className="p-6 cursor-pointer hover:bg-accent transition-colors">
                  <h3 className="font-semibold">Foco e Concentração</h3>
                  <p className="text-sm text-muted-foreground mt-2">12 minutos</p>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diary">
            <Card>
              <CardHeader>
                <CardTitle>Diário de Emoções</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {emotions.map((emotion) => (
                    <button
                      key={emotion.id}
                      onClick={() => setSelectedEmotion(emotion.id)}
                      className={`p-6 rounded-xl transition-all transform hover:scale-105 ${emotion.color} 
                        ${selectedEmotion === emotion.id ? 'ring-2 ring-primary' : ''}`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        {emotion.icon}
                        <span className="text-sm font-medium">{emotion.label}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="bg-card rounded-lg p-4 shadow-sm">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-lg"
                    classNames={{
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary/90",
                      day_today: "bg-accent text-accent-foreground",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-full transition-colors",
                      cell: "text-center p-0",
                      head_cell: "text-muted-foreground font-normal",
                      nav_button: "hover:bg-accent rounded-full transition-colors",
                      table: "w-full border-collapse space-y-1",
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-medium block">Como você está se sentindo hoje?</label>
                  <Textarea
                    placeholder="Escreva sobre suas emoções..."
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="min-h-[150px] resize-none"
                  />
                  <Button className="w-full mt-4">Salvar Registro</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>IA Conselheira</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="rounded-lg bg-accent/50 p-6 mb-4">
                  <p className="text-sm">
                    Olá! Sou sua assistente de bem-estar mental. Como posso ajudar você hoje?
                  </p>
                </div>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  className="min-h-[100px] mb-4"
                />
                <Button className="w-full">Enviar</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle>Recursos Educativos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Contatos de Emergência</h3>
                  <p className="text-sm text-muted-foreground">CVV - 188</p>
                  <p className="text-sm text-muted-foreground mt-2">SAMU - 192</p>
                </Card>
                
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Artigos Recomendados</h3>
                  <ul className="space-y-3">
                    <li className="text-sm text-primary hover:underline cursor-pointer">
                      Como lidar com a ansiedade
                    </li>
                    <li className="text-sm text-primary hover:underline cursor-pointer">
                      Técnicas de mindfulness
                    </li>
                    <li className="text-sm text-primary hover:underline cursor-pointer">
                      Melhorando a qualidade do sono
                    </li>
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
