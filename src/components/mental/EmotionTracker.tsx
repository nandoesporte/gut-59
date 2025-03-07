
import React from 'react';
import { Card } from '@/components/ui/card';

interface EmotionLog {
  id: string;
  emotion: string;
  created_at: string;
  user_id: string;
}

export function EmotionTracker({ emotions }: { emotions: EmotionLog[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Your Emotion Log</h3>
      
      {emotions.length === 0 ? (
        <p className="text-gray-500 text-sm">No emotion logs yet. Start tracking how you feel.</p>
      ) : (
        <div className="grid gap-2">
          {emotions.slice(0, 5).map((log) => (
            <Card key={log.id} className="p-3 flex justify-between items-center">
              <span className="font-medium">{log.emotion}</span>
              <span className="text-xs text-gray-500">
                {new Date(log.created_at).toLocaleDateString()}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
