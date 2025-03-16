import * as React from 'react';
import { useState } from 'react';
import { FisioPreferences } from '@/components/fisio/types';
import { FisioPreferencesForm } from '@/components/fisio/PreferencesForm';
import { ExercisePlanDisplay } from '@/components/fisio/ExercisePlanDisplay';
import { Stethoscope, Bot } from 'lucide-react';
import { FisioHistoryView } from '@/components/fisio/components/FisioHistory';
import { supabase } from '@/integrations/supabase/client';
import type { RehabPlan } from '@/components/fisio/types/rehab-plan';
import { Badge } from '@/components/ui/badge';

const Fisio = () => {
  const [preferences, setPreferences] = useState<FisioPreferences | null>(null);
  const [historyPlans, setHistoryPlans] = useState<RehabPlan[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchFisioHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: plansData, error } = await supabase
        .from('rehab_plans')
        .select(`
          *,
          rehab_sessions:rehab_sessions (
            *,
            rehab_session_exercises (
              *,
              exercise:exercises (*)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match RehabPlan type
      const transformedPlans: RehabPlan[] = (plansData || []).map(plan => ({
        id: plan.id,
        user_id: plan.user_id,
        goal: plan.goal,
        condition: plan.condition,
        start_date: plan.start_date,
        end_date: plan.end_date,
        created_at: plan.created_at,
        plan_data: plan.plan_data || null,
        rehab_sessions: (plan.rehab_sessions || []).map((session: any) => ({
          day_number: session.day_number,
          warmup_description: session.warmup_description,
          cooldown_description: session.cooldown_description,
          exercises: (session.rehab_session_exercises || []).map((se: any) => ({
            name: se.exercise.name,
            sets: se.sets,
            reps: se.reps,
            rest_time_seconds: se.rest_time_seconds,
            gifUrl: se.exercise.gif_url,
            notes: se.exercise.description
          }))
        }))
      }));

      setHistoryPlans(transformedPlans);
    } catch (error) {
      console.error('Error fetching rehab history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  React.useEffect(() => {
    fetchFisioHistory();
  }, []);

  const handleSubmitPreferences = (data: FisioPreferences) => {
    setPreferences(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-600">
            Fisioterapia Personalizada
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Crie um plano de reabilitação personalizado baseado em suas necessidades específicas
          </p>
          <Badge variant="outline" className="inline-flex items-center gap-1 bg-primary/5">
            <Bot className="w-3 h-3" />
            Powered by Fisio+ (Llama 3 8B)
          </Badge>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {!preferences ? (
            <div className="transform transition-all duration-500 hover:scale-[1.01]">
              <FisioPreferencesForm onSubmit={handleSubmitPreferences} />
            </div>
          ) : (
            <ExercisePlanDisplay 
              preferences={preferences} 
              onReset={() => setPreferences(null)} 
            />
          )}

          <div className="mt-8">
            <FisioHistoryView
              isLoading={isLoadingHistory}
              historyPlans={historyPlans}
              onRefresh={fetchFisioHistory}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fisio;
