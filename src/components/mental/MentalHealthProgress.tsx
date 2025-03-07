
import React from 'react';
import { Card } from '@/components/ui/card';

interface EmotionLog {
  id: string;
  emotion: string;
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

export function MentalHealthProgress({ 
  emotions, 
  chatHistory 
}: { 
  emotions: EmotionLog[];
  chatHistory: ChatMessage[];
}) {
  // Calculate some basic stats
  const totalEmotions = emotions.length;
  const positiveEmotions = emotions.filter(e => 
    ['happy', 'excited', 'content', 'relaxed', 'calm'].includes(e.emotion.toLowerCase())
  ).length;
  
  const positivePercentage = totalEmotions > 0 
    ? Math.round((positiveEmotions / totalEmotions) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Mental Health Progress</h3>
      
      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1">Emotion Tracking</h4>
            <p className="text-xs text-gray-600">
              Total entries: {totalEmotions}
            </p>
            {totalEmotions > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">
                  Positive emotions: {positivePercentage}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${positivePercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-1">Chat Interactions</h4>
            <p className="text-xs text-gray-600">
              Total conversations: {chatHistory.length}
            </p>
          </div>
        </div>
      </Card>
      
      <div className="text-sm text-gray-500 italic">
        Continue tracking your emotions daily to see more detailed insights.
      </div>
    </div>
  );
}
