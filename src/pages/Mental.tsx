
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Clock, Headphones, BookOpen, MessageCircle } from "lucide-react";

const Mental = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [mood, setMood] = useState('');
  const [isBreathing, setIsBreathing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [breathingPhase, setBreathingPhase] = useState('');

  const startBreathing = () => {
    setIsBreathing(true);
    let totalSeconds = 0;
    
    const interval = setInterval(() => {
      totalSeconds++;
      setSeconds(totalSeconds);
      
      // 4-7-8 Breathing pattern
      const cycle = totalSeconds % 19; // 4 + 7 + 8 = 19 seconds per cycle
      if (cycle < 4) {
        setBreathingPhase('Inspire (4s)');
      } else if (cycle < 11) {
        setBreathingPhase('Segure (7s)');
      } else {
        setBreathingPhase('Expire (8s)');
      }
    }, 1000);

    // Stop after 5 minutes
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
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-4">
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

        <TabsContent value="breathing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Técnicas de Respiração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isBreathing ? (
                <Button onClick={startBreathing} size="lg" className="w-full">
                  Iniciar Exercício 4-7-8
                </Button>
              ) : (
                <div className="text-center space-y-4">
                  <div className="text-4xl font-bold text-primary animate-pulse">
                    {breathingPhase}
                  </div>
                  <div className="text-2xl">
                    {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meditation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Meditação Guiada</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Card className="p-4 cursor-pointer hover:bg-accent transition-colors">
                <h3 className="font-semibold">Redução de Ansiedade</h3>
                <p className="text-sm text-muted-foreground">10 minutos</p>
              </Card>
              <Card className="p-4 cursor-pointer hover:bg-accent transition-colors">
                <h3 className="font-semibold">Melhora do Sono</h3>
                <p className="text-sm text-muted-foreground">15 minutos</p>
              </Card>
              <Card className="p-4 cursor-pointer hover:bg-accent transition-colors">
                <h3 className="font-semibold">Foco e Concentração</h3>
                <p className="text-sm text-muted-foreground">12 minutos</p>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Diário de Emoções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Como você está se sentindo hoje?</label>
                <Textarea
                  placeholder="Escreva sobre suas emoções..."
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="min-h-[150px]"
                />
                <Button className="w-full">Salvar Registro</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Aconselhamento com IA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-accent p-4 mb-4">
                <p className="text-sm">
                  Olá! Sou sua assistente de bem-estar mental. Como posso ajudar você hoje?
                </p>
              </div>
              <Textarea
                placeholder="Digite sua mensagem..."
                className="mb-4"
              />
              <Button className="w-full">Enviar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recursos Educativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Contatos de Emergência</h3>
                  <p className="text-sm text-muted-foreground">CVV - 188</p>
                  <p className="text-sm text-muted-foreground">SAMU - 192</p>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Artigos Recomendados</h3>
                  <ul className="space-y-2">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Mental;
