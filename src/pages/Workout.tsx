
import * as React from 'react';
import { useState } from 'react';
import { WorkoutPreferences } from '@/components/workout/types';
import { PreferencesForm } from '@/components/workout/PreferencesForm';
import { WorkoutPlanDisplay } from '@/components/workout/WorkoutPlanDisplay';
import { Card } from '@/components/ui/card';
import { Dumbbell } from 'lucide-react';

const Workout = () => {
  const [preferences, setPreferences] = useState<WorkoutPreferences | null>(null);

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
    </div>
  );
};

export default Workout;
