
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BreathingSession {
  id: string;
  duration: number;
  technique: string;
  created_at: string;
  user_id: string;
}

export function BreathingExercises({ lastSession }: { lastSession: BreathingSession | null }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Breathing Exercises</h3>
      
      <div className="grid gap-3">
        <Card className="p-4">
          <h4 className="font-medium mb-2">Box Breathing</h4>
          <p className="text-sm text-gray-600 mb-3">
            Breathe in for 4 seconds, hold for 4 seconds, breathe out for 4 seconds, hold for 4 seconds.
          </p>
          <Button variant="outline" size="sm">Start Exercise</Button>
        </Card>
        
        <Card className="p-4">
          <h4 className="font-medium mb-2">4-7-8 Technique</h4>
          <p className="text-sm text-gray-600 mb-3">
            Breathe in for 4 seconds, hold for 7 seconds, breathe out for 8 seconds.
          </p>
          <Button variant="outline" size="sm">Start Exercise</Button>
        </Card>
      </div>
      
      {lastSession && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-medium">Last Session</h4>
          <p className="text-xs text-gray-500">
            {lastSession.technique} - {lastSession.duration} seconds
            <br />
            {new Date(lastSession.created_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
