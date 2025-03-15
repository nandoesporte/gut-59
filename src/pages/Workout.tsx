
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { WorkoutPreferences } from '@/components/workout/types';
import { PreferencesForm } from '@/components/workout/PreferencesForm';
import { WorkoutPlanDisplay } from '@/components/workout/WorkoutPlanDisplay';
import WorkoutHistory from '@/components/workout/components/WorkoutHistory';
import ExerciseLibrary from '@/components/workout/components/ExerciseLibrary';
import { Dumbbell, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { WorkoutPlan } from '@/components/workout/types/workout-plan';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Workout = () => {
  const [preferences, setPreferences] = useState<WorkoutPreferences | null>(null);
  const [historyPlans, setHistoryPlans] = useState<WorkoutPlan[]>([]);
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
      console.log('Opening plan details for:', planId);
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

  const fetchWorkoutHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHistoryPlans([]);
        return;
      }

      const { data: plans, error } = await supabase
        .from('workout_plans')
        .select(`
          *,
          workout_sessions (
            *,
            session_exercises (
              *,
              exercise:exercises (*)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workout history:', error);
        toast.error('Erro ao carregar o histórico de treinos');
        throw error;
      }
      
      setHistoryPlans(plans || []);
    } catch (error) {
      console.error('Error fetching workout history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkoutHistory();
    }
  }, [fetchWorkoutHistory, isAuthenticated]);

  const handlePreferencesSubmit = (prefs: WorkoutPreferences) => {
    console.log('Preferências submetidas no componente Workout:', prefs);
    setPreferences(prefs);
  }

  const handleWorkoutPlanGenerated = () => {
    // Refresh history after a new plan is generated
    fetchWorkoutHistory();
  };

  const handleLoginClick = () => {
    navigate('/login?redirect=/workout');
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
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Autenticação Necessária</h2>
              <p className="text-muted-foreground">
                Você precisa estar logado para acessar os planos de treino personalizados.
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
            <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-600">
            Plano de Treino Personalizado
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto px-2">
            Crie um plano de treino personalizado baseado em suas preferências e objetivos
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {!preferences ? (
            <div className="transform transition-all duration-300 hover:scale-[1.01]">
              <PreferencesForm onSubmit={handlePreferencesSubmit} />
            </div>
          ) : (
            <WorkoutPlanDisplay 
              preferences={preferences} 
              onReset={() => setPreferences(null)}
              onPlanGenerated={handleWorkoutPlanGenerated}
            />
          )}

          <div className="mt-4 sm:mt-6">
            <ExerciseLibrary />
            
            <WorkoutHistory
              plans={historyPlans}
              isLoading={isLoadingHistory}
              onRefresh={fetchWorkoutHistory}
              selectedPlanId={selectedPlanId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workout;
