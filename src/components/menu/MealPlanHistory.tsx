import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { MealPlan } from './types';
import { generateMealPlanPDF } from './utils/pdf-generator';
import { toast } from 'sonner';
import { Download, Eye, List, Trash2 } from 'lucide-react';
import { SavedMealPlanDetails } from './components/SavedMealPlanDetails';

interface StoredMealPlan {
  id: string;
  created_at: string;
  plan_data: MealPlan;
  calories: number;
}

interface RawMealPlan {
  id: string;
  created_at: string;
  plan_data: unknown;
  calories: number;
}

const validateMealPlan = (planData: unknown): planData is MealPlan => {
  const plan = planData as MealPlan;
  return !!(
    plan &&
    typeof plan === 'object' &&
    'weeklyPlan' in plan &&
    'weeklyTotals' in plan &&
    'recommendations' in plan
  );
};

export const MealPlanHistory = () => {
  const [plans, setPlans] = useState<StoredMealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewPlanId, setViewPlanId] = useState<string | null>(null);
  const [viewPlanData, setViewPlanData] = useState<MealPlan | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validPlans = (data as RawMealPlan[]).reduce<StoredMealPlan[]>((acc, plan) => {
        if (validateMealPlan(plan.plan_data)) {
          acc.push({
            id: plan.id,
            created_at: plan.created_at,
            plan_data: plan.plan_data as MealPlan,
            calories: plan.calories,
          });
        } else {
          console.error('Invalid meal plan data for plan:', plan.id);
        }
        return acc;
      }, []);

      setPlans(validPlans);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
      toast.error('Erro ao carregar histórico de planos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPlans(plans.filter(plan => plan.id !== id));
      toast.success('Plano excluído com sucesso');
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      toast.error('Erro ao excluir plano');
    }
    setDeleteId(null);
  };

  const handleDownload = async (plan: StoredMealPlan) => {
    try {
      await generateMealPlanPDF(plan.plan_data);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleViewDetails = (plan: StoredMealPlan) => {
    setViewPlanId(plan.id);
    setViewPlanData(plan.plan_data);
  };

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <List className="w-6 h-6" />
        Histórico de Planos Alimentares
      </h2>
      
      {loading ? (
        <div className="text-center">Carregando histórico...</div>
      ) : plans.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          Nenhum plano alimentar gerado ainda
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">
                    Plano gerado em {format(new Date(plan.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Média diária: {Math.round(plan.calories)} kcal
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(plan)}
                    className="flex-1 sm:flex-initial justify-center min-w-[80px]"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    <span className="sm:inline">Detalhes</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(plan)}
                    className="flex-1 sm:flex-initial justify-center min-w-[80px]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    <span className="sm:inline">Baixar PDF</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(plan.id)}
                    className="flex-1 sm:flex-initial justify-center min-w-[80px] text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span className="sm:inline">Excluir</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[95%] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este plano alimentar? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-500 hover:bg-red-600 w-full sm:w-auto"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewPlanData && (
        <SavedMealPlanDetails
          planId={viewPlanId || ""}
          planData={viewPlanData}
          isOpen={!!viewPlanId}
          onClose={() => {
            setViewPlanId(null);
            setViewPlanData(null);
            fetchPlans();
          }}
        />
      )}
    </div>
  );
};
