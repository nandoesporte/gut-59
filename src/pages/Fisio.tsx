
import * as React from 'react';
import { useState, useEffect } from 'react';
import { FisioPreferences } from '@/components/fisio/types';
import { FisioPreferencesForm } from '@/components/fisio/PreferencesForm';
import { ExercisePlanDisplay } from '@/components/fisio/ExercisePlanDisplay';
import { Stethoscope, AlertTriangle } from 'lucide-react';
import { FisioHistoryView } from '@/components/fisio/components/FisioHistory';
import { supabase } from '@/integrations/supabase/client';
import type { RehabPlan } from '@/components/fisio/types/rehab-plan';
import { toast } from 'sonner';

const Fisio = () => {
  const [preferences, setPreferences] = useState<FisioPreferences | null>(null);
  const [historyPlans, setHistoryPlans] = useState<RehabPlan[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFisioHistory = async () => {
    try {
      setIsLoadingHistory(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Usuário não autenticado. Por favor, faça login.");
        return;
      }

      const { data: plansData, error: fetchError } = await supabase
        .from('rehab_plans')
        .select(`
          *,
          rehab_sessions:rehab_sessions (
            *,
            rehab_session_exercises (
              *,
              exercise:physio_exercises (*)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error("Erro ao buscar histórico de reabilitação:", fetchError);
        setError("Erro ao buscar seu histórico de reabilitação. Por favor, tente novamente.");
        throw fetchError;
      }

      // Transform the data to match RehabPlan type
      const transformedPlans: RehabPlan[] = (plansData || []).map(plan => ({
        id: plan.id,
        user_id: plan.user_id,
        goal: plan.goal,
        start_date: plan.start_date,
        end_date: plan.end_date,
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
        })),
        // Add plan_data if available for backward compatibility
        ...((plan.plan_data && typeof plan.plan_data === 'object') ? { 
          days: plan.plan_data.days,
          overview: plan.plan_data.overview,
          recommendations: plan.plan_data.recommendations
        } : {})
      }));

      setHistoryPlans(transformedPlans);
    } catch (error) {
      console.error('Error fetching rehab history:', error);
      toast.error("Falha ao carregar histórico de planos");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchFisioHistory();
  }, []);

  const handlePreferencesSubmit = (newPreferences: FisioPreferences) => {
    setError(null);
    setPreferences(newPreferences);
  };

  const handleReset = () => {
    setPreferences(null);
    setError(null);
    // Refresh history after creating a new plan
    fetchFisioHistory();
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
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-center justify-center space-x-3 max-w-2xl mx-auto">
              <AlertTriangle className="text-red-500 w-5 h-5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {!preferences ? (
            <div className="transform transition-all duration-500 hover:scale-[1.01]">
              <FisioPreferencesForm onSubmit={handlePreferencesSubmit} />
            </div>
          ) : (
            <ExercisePlanDisplay 
              preferences={preferences} 
              onReset={handleReset} 
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
