
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Calendar, Clock } from 'lucide-react';
import { EmotionTracker } from './EmotionTracker';
import { BreathingExercises } from './BreathingExercises';
import { MentalHealthProgress } from './MentalHealthProgress';

interface EmotionLog {
  id: string;
  emotion: string;
  created_at: string;
  user_id: string;
}

export function MentalHealthSummary() {
  const [emotionLogs, setEmotionLogs] = useState<EmotionLog[]>([]);
  const [activeTab, setActiveTab] = useState('tracker');

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch emotion logs
      const { data: emotions } = await supabase
        .from('emotion_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (emotions) {
        setEmotionLogs(emotions);
      }
    };
    
    fetchData();
  }, []);

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Saúde Mental</h2>
        <p className="text-sm text-gray-500">Acompanhe seu progresso emocional e mental</p>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="tracker" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Rastreador</span>
          </TabsTrigger>
          <TabsTrigger value="breathing" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Respiração</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Progresso</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tracker">
          <EmotionTracker emotions={emotionLogs} />
        </TabsContent>
        
        <TabsContent value="breathing">
          <BreathingExercises lastSession={null} />
        </TabsContent>
        
        <TabsContent value="progress">
          <MentalHealthProgress emotions={emotionLogs} chatHistory={[]} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
