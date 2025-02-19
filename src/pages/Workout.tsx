
import * as React from 'react';
import { useState } from 'react';
import { WorkoutPreferences } from '@/components/workout/types';
import { PreferencesForm } from '@/components/workout/PreferencesForm';
import { WorkoutPlanDisplay } from '@/components/workout/WorkoutPlanDisplay';
import { Dumbbell } from 'lucide-react';

const Workout = () => {
  const [preferences, setPreferences] = useState<WorkoutPreferences | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full">
            <Dumbbell className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-600">
            Plano de Treino Personalizado
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Crie um plano de treino personalizado baseado em suas preferências e objetivos
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {!preferences ? (
            <div className="transform transition-all duration-500 hover:scale-[1.01]">
              <PreferencesForm onSubmit={setPreferences} />
            </div>
          ) : (
            <WorkoutPlanDisplay preferences={preferences} onReset={() => setPreferences(null)} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Workout;
