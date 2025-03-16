
import * as React from 'react';
import { useState } from 'react';
import { FisioPreferences } from '@/components/fisio/types';
import { FisioPreferencesForm } from '@/components/fisio/PreferencesForm';
import { ExercisePlanDisplay } from '@/components/fisio/ExercisePlanDisplay';
import { Stethoscope } from 'lucide-react';
import { FisioHistoryView } from '@/components/fisio/components/FisioHistory';
import { supabase } from '@/integrations/supabase/client';
import type { RehabPlan } from '@/components/fisio/types/rehab-plan';
import { useToast } from '@/hooks/use-toast';

const Fisio = () => {
  const [preferences, setPreferences] = useState<FisioPreferences | null>(null);
  const [historyPlans, setHistoryPlans] = useState<RehabPlan[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { toast } = useToast();

  const fetchFisioHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Changed query to not use relationship that isn't set up correctly
      const { data: plansData, error } = await supabase
        .from('rehab_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de reabilitação:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar seu histórico de reabilitação',
          variant: 'destructive'
        });
        return;
      }

      console.log('Planos de reabilitação recuperados:', plansData);

      // Transform the data to match RehabPlan type using plan_data
      const transformedPlans: RehabPlan[] = (plansData || []).map(plan => {
        // Parse the plan_data if it's a string, otherwise use it as is
        let parsedData: Record<string, any> = {};
        
        if (plan.plan_data) {
          if (typeof plan.plan_data === 'string') {
            try {
              parsedData = JSON.parse(plan.plan_data);
            } catch (e) {
              console.error('Erro ao analisar plan_data:', e);
              // If parsing fails, use an empty object
              parsedData = {};
            }
          } else if (typeof plan.plan_data === 'object') {
            // If it's already an object, use it directly
            parsedData = plan.plan_data as Record<string, any>;
          }
        }
        
        return {
          id: plan.id,
          user_id: plan.user_id,
          goal: plan.goal,
          condition: plan.condition || (parsedData.condition || null),
          joint_area: plan.joint_area,
          start_date: plan.start_date,
          end_date: plan.end_date,
          overview: parsedData.overview || "Plano de reabilitação",
          recommendations: parsedData.recommendations || [],
          days: parsedData.days || {},
          rehab_sessions: parsedData.rehab_sessions || []
        };
      });

      setHistoryPlans(transformedPlans);
    } catch (error) {
      console.error('Erro ao buscar histórico de reabilitação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seu histórico de reabilitação',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  React.useEffect(() => {
    fetchFisioHistory();
  }, []);

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
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {!preferences ? (
            <div className="transform transition-all duration-500 hover:scale-[1.01]">
              <FisioPreferencesForm onSubmit={(prefs) => {
                setPreferences(prefs);
                // Scroll to top when generating a new plan
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} />
            </div>
          ) : (
            <ExercisePlanDisplay 
              preferences={preferences} 
              onReset={() => {
                setPreferences(null);
                // Refresh history when resetting to generate a new plan
                fetchFisioHistory();
              }} 
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
