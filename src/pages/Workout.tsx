
import * as React from 'react';
import { useState } from 'react';
import { WorkoutPreferences } from '@/components/workout/types';
import { PreferencesForm } from '@/components/workout/PreferencesForm';
import { WorkoutPlanDisplay } from '@/components/workout/WorkoutPlanDisplay';
import { Card } from '@/components/ui/card';
import { Dumbbell, History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkoutHistoryView } from '@/components/workout/components/WorkoutHistory';
import { WorkoutHistory } from '@/components/workout/types/workout-plan';

const Workout = () => {
  const [preferences, setPreferences] = useState<WorkoutPreferences | null>(null);

  const { data: historyPlans, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['workout-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select(`
          *,
          workout_sessions (
            *,
            session_exercises (
              *,
              exercises (*)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkoutHistory[];
    }
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <Dumbbell className="w-8 h-8 text-primary-500" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          Plano de Treino Personalizado
        </h1>
      </div>

      {!preferences ? (
        <Card className="p-6">
          <PreferencesForm onSubmit={setPreferences} />
        </Card>
      ) : (
        <WorkoutPlanDisplay preferences={preferences} onReset={() => setPreferences(null)} />
      )}

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-semibold">Histórico de Planos</h2>
        </div>
        <WorkoutHistoryView isLoading={isHistoryLoading} historyPlans={historyPlans} />
      </div>
    </div>
  );
};

export default Workout;
