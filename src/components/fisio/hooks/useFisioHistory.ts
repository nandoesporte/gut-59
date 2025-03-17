
import { useState, useCallback, useEffect } from 'react';
import { RehabPlan } from '../types/rehab-plan';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const useFisioHistory = (isAuthenticated: boolean | null) => {
  const [historyPlans, setHistoryPlans] = useState<RehabPlan[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const navigate = useNavigate();

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
          rehab_sessions: parsedData.rehab_sessions || [],
          created_at: plan.created_at || new Date().toISOString()
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

  // Função para excluir um plano de reabilitação
  const deletePlan = useCallback(async (planId: string) => {
    try {
      setIsDeletingPlan(true);
      console.log("Iniciando exclusão do plano:", planId);
      
      // Verificar se o plano está sendo visualizado atualmente
      const currentUrl = new URL(window.location.href);
      const currentPlanId = currentUrl.searchParams.get('planId');
      
      // Se o plano que está sendo excluído for o que está sendo visualizado,
      // redirecionamos para a página principal primeiro
      if (currentPlanId === planId) {
        console.log("Excluindo plano ativo, redirecionando para página principal");
        navigate('/fisio');
      }
      
      const { error } = await supabase
        .from('rehab_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error('Erro ao excluir plano de reabilitação:', error);
        toast.error('Erro ao excluir plano de reabilitação');
        return false;
      }

      console.log("Plano excluído com sucesso:", planId);
      toast.success('Plano de reabilitação excluído com sucesso');
      
      // Atualiza a lista de planos após a exclusão
      setHistoryPlans(prevPlans => prevPlans.filter(plan => plan.id !== planId));
      return true;
    } catch (error) {
      console.error('Erro ao excluir plano de reabilitação:', error);
      toast.error('Erro ao excluir plano de reabilitação');
      return false;
    } finally {
      setIsDeletingPlan(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFisioHistory();
    }
  }, [fetchFisioHistory, isAuthenticated]);

  return { 
    historyPlans, 
    isLoadingHistory, 
    fetchFisioHistory, 
    deletePlan,
    isDeletingPlan 
  };
};
