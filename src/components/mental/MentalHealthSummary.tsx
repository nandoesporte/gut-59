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

interface BreathingSession {
  id: string;
  duration: number;
  technique: string;
  created_at: string;
  user_id: string;
}

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  user_id: string;
}

export function MentalHealthSummary() {
  const [emotionLogs, setEmotionLogs] = useState<EmotionLog[]>([]);
  const [lastSession, setLastSession] = useState<BreathingSession | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
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
      
      // We'll add these tables in a future migration to avoid deadlocks
      // For now we'll comment these out
      /*
      // Fetch last breathing session
      const { data: session } = await supabase
        .from('breathing_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (session) {
        setLastSession(session);
      }
      
      // Fetch chat history
      const { data: chat } = await supabase
        .from('mental_chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (chat) {
        setChatHistory(chat);
      }
      */
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
          <BreathingExercises lastSession={lastSession} />
        </TabsContent>
        
        <TabsContent value="progress">
          <MentalHealthProgress emotions={emotionLogs} chatHistory={chatHistory} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

// Stub components that would be implemented separately
function EmotionTracker({ emotions }: { emotions: EmotionLog[] }) {
  return <div>Emotion Tracker Component (implement separately)</div>;
}

function BreathingExercises({ lastSession }: { lastSession: BreathingSession | null }) {
  return <div>Breathing Exercises Component (implement separately)</div>;
}

function MentalHealthProgress({ 
  emotions, 
  chatHistory 
}: { 
  emotions: EmotionLog[];
  chatHistory: ChatMessage[];
}) {
  return <div>Mental Health Progress Component (implement separately)</div>;
}
