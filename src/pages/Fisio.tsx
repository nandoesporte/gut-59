
import * as React from 'react';
import { useState, useEffect } from 'react';
import { FisioPreferences } from '@/components/fisio/types';
import { FisioPreferencesForm } from '@/components/fisio/PreferencesForm';
import { ExercisePlanDisplay } from '@/components/fisio/ExercisePlanDisplay';
import { Stethoscope, Bot } from 'lucide-react';
import { FisioHistoryView } from '@/components/fisio/components/FisioHistory';
import { supabase } from '@/integrations/supabase/client';
import type { RehabPlan } from '@/components/fisio/types/rehab-plan';
import { Badge } from '@/components/ui/badge';
import { toast } from "sonner";

const Fisio = () => {
  const [preferences, setPreferences] = useState<FisioPreferences | null>(null);
  const [historyPlans, setHistoryPlans] = useState<RehabPlan[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isPaymentRequired, setIsPaymentRequired] = useState(false);

  // Check if payment is required for rehab plans
  useEffect(() => {
    const checkPaymentRequirement = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        if (!userData?.user) return;
        
        // First check global payment settings
        const { data: paymentSettings, error: settingsError } = await supabase
          .from('payment_settings')
          .select('is_active')
          .eq('plan_type', 'rehabilitation')
          .single();
          
        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error('Error checking payment settings:', settingsError);
          return;
        }
        
        // If payment is not globally active, no payment is required
        if (!paymentSettings?.is_active) {
          setIsPaymentRequired(false);
          return;
        }
        
        // Check if the user has special access
        const { data: planAccess, error: accessError } = await supabase
          .from('plan_access')
          .select('payment_required')
          .eq('user_id', userData.user.id)
          .eq('plan_type', 'rehabilitation')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (accessError && accessError.code !== 'PGRST116') {
          console.error('Error checking plan access:', accessError);
          return;
        }
        
        // If user has special access and payment is not required, no payment is required
        if (planAccess && !planAccess.payment_required) {
          setIsPaymentRequired(false);
          return;
        }
        
        // Check generation count
        const { data: counts, error: countError } = await supabase
          .from('plan_generation_counts')
          .select('rehabilitation_count')
          .eq('user_id', userData.user.id)
          .maybeSingle();
          
        if (countError) {
          console.error('Error checking generation count:', countError);
          return;
        }
        
        const currentCount = counts?.rehabilitation_count || 0;
        
        // If user has used less than 3 generations, no payment is required
        setIsPaymentRequired(currentCount >= 3);
        
      } catch (error) {
        console.error('Error checking payment requirement:', error);
      }
    };
    
    checkPaymentRequirement();
  }, []);

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

      const transformedPlans: RehabPlan[] = (plansData || []).map((plan: any) => ({
        id: plan.id,
        user_id: plan.user_id,
        goal: plan.goal,
        condition: plan.condition,
        start_date: plan.start_date,
        end_date: plan.end_date,
        created_at: plan.created_at,
        plan_data: typeof plan.plan_data === 'undefined' ? {} : plan.plan_data,
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
    // Set default values for fields we removed from the form
    data.injuryDescription = "Lesão relacionada à área afetada";
    data.injuryDuration = "Recente";
    data.previousTreatments = "Nenhum tratamento anterior específico";
    data.exerciseExperience = "moderate";
    data.equipmentAvailable = ["elastic bands", "foam roller", "chair"];
    data.painLocation = data.joint_area === "shoulder" ? "Ombro" 
                     : data.joint_area === "knee" ? "Joelho"
                     : data.joint_area === "ankle_foot" ? "Tornozelo/Pé"
                     : data.joint_area === "spine" ? "Coluna"
                     : data.joint_area === "hip" ? "Quadril"
                     : data.joint_area === "elbow_hand" ? "Cotovelo/Mão"
                     : data.joint_area === "leg" ? "Perna" 
                     : "Área afetada";
    
    setPreferences(data);
    toast.info("Gerando plano de reabilitação personalizado. Isso pode levar alguns instantes...");
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
            Powered by Fisio+ (Llama 3 70B)
          </Badge>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {!preferences ? (
            <div className="transform transition-all duration-500 hover:scale-[1.01]">
              <FisioPreferencesForm 
                onSubmit={handleSubmitPreferences} 
                isPaymentRequired={isPaymentRequired}
              />
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
