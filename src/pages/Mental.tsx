
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Brain, Clock, Headphones, BookOpen, MessageCircle, Smile, SmilePlus, Frown, Meh, Angry, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MentalHealthResources } from '@/components/mental/MentalHealthResources';

const Mental = () => {
  const [date] = useState<Date>(new Date());
  const [mood, setMood] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [activeTab, setActiveTab] = useState('breathing');

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
                  <h3 className="font-semibold text-primary mb-4">Materiais Educativos</h3>
                  <div className="grid gap-4">
                    {[
                      { title: 'Guia de Saúde Mental', type: 'PDF', size: '2.3 MB' },
                      { title: 'Técnicas de Relaxamento', type: 'Vídeo', duration: '15 min' },
                      { title: 'Práticas de Mindfulness', type: 'Áudio', duration: '20 min' }
                    ].map((material, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium">{material.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {material.type} • {material.duration || material.size}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <BookOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
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
