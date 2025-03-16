
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { FisioPreferences } from '@/components/fisio/types';
import { FisioPreferencesForm } from '@/components/fisio/PreferencesForm';
import { ExercisePlanDisplay } from '@/components/fisio/ExercisePlanDisplay';
import { Stethoscope, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { RehabPlan } from '@/components/fisio/types/rehab-plan';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FisioHistoryView } from '@/components/fisio/components/FisioHistory';

const Fisio = () => {
  const [preferences, setPreferences] = useState<FisioPreferences | null>(null);
  const [historyPlans, setHistoryPlans] = useState<RehabPlan[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Check URL parameters for plan ID and view mode
  useEffect(() => {
    const planId = searchParams.get('planId');
    const viewMode = searchParams.get('view');
    
    if (planId && viewMode === 'details') {
      console.log('Opening rehab plan details for:', planId);
      setSelectedPlanId(planId);
    }
  }, [searchParams]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      console.log("Authentication status:", !!user);
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
      console.log("Auth state change:", event, !!session?.user);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchFisioHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHistoryPlans([]);
        return;
      }

      const { data: plansData, error } = await supabase
        .from('rehab_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de reabilitação:', error);
        toast.error('Erro ao carregar seu histórico de reabilitação');
        throw error;
      }

      console.log('Planos de reabilitação recuperados:', plansData);

      const transformedPlans: RehabPlan[] = (plansData || []).map(plan => {
        let parsedData: Record<string, any> = {};
        
        try {
          if (plan.plan_data) {
            if (typeof plan.plan_data === 'string') {
              parsedData = JSON.parse(plan.plan_data);
            } else if (typeof plan.plan_data === 'object') {
              parsedData = plan.plan_data as Record<string, any>;
            }
          }
        } catch (e) {
          console.error('Erro ao analisar plan_data:', e, plan.plan_data);
          parsedData = {};
        }
        
        const goalValue = plan.goal ? 
          (typeof plan.goal === 'string' && plan.goal.length === 0 ? "pain_relief" : plan.goal) 
          : "pain_relief";
        
        return {
          id: plan.id,
          user_id: plan.user_id,
          goal: goalValue,
          condition: plan.condition || parsedData.condition || '',
          joint_area: plan.joint_area || '',
          start_date: plan.start_date || new Date().toISOString(),
          end_date: plan.end_date || new Date().toISOString(),
          overview: parsedData.overview || "Plano de reabilitação",
          recommendations: parsedData.recommendations || [],
          days: parsedData.days || {},
          rehab_sessions: parsedData.rehab_sessions || []
        };
      });

      setHistoryPlans(transformedPlans);
    } catch (error) {
      console.error('Erro ao buscar histórico de reabilitação:', error);
      toast.error('Erro ao carregar seu histórico de reabilitação');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFisioHistory();
    }
  }, [fetchFisioHistory, isAuthenticated]);

  const handlePreferencesSubmit = (prefs: FisioPreferences) => {
    console.log('Preferências submetidas no componente Fisio:', prefs);
    setPreferences(prefs);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handlePlanGenerated = () => {
    // Refresh history after a new plan is generated
    fetchFisioHistory();
  };

  const handleLoginClick = () => {
    navigate('/login?redirect=/fisio');
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-6 flex items-center justify-center h-screen">
          <p className="text-center text-lg text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-6 flex items-center justify-center h-screen">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center space-y-6">
              <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full">
                <Stethoscope className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Autenticação Necessária</h2>
              <p className="text-muted-foreground">
                Você precisa estar logado para acessar os planos de fisioterapia personalizados.
              </p>
              <Button onClick={handleLoginClick} size="lg" className="gap-2">
                <LogIn className="w-4 h-4" />
                Fazer Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6 pb-20 sm:pb-24">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-1.5 sm:p-2 bg-primary/10 rounded-full">
            <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-600">
            Fisioterapia Personalizada
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto px-2">
            Crie um plano de reabilitação personalizado baseado em suas necessidades específicas
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {!preferences ? (
            <div className="transform transition-all duration-300 hover:scale-[1.01]">
              <FisioPreferencesForm onSubmit={handlePreferencesSubmit} />
            </div>
          ) : (
            <ExercisePlanDisplay 
              preferences={preferences} 
              onReset={() => {
                setPreferences(null);
                fetchFisioHistory();
              }}
              onPlanGenerated={handlePlanGenerated}
            />
          )}

          <div className="mt-4 sm:mt-6">
            <FisioHistoryView
              isLoading={isLoadingHistory}
              historyPlans={historyPlans}
              onRefresh={fetchFisioHistory}
              selectedPlanId={selectedPlanId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fisio;
