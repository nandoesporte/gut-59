
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Trash2 } from "lucide-react";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { MealPlan } from "./types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StoredMealPlan extends MealPlan {
  id: string;
  created_at: string;
}

export const MealPlanHistory = () => {
  const [plans, setPlans] = useState<StoredMealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      setPlans(data || []);
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

  const handleDownload = async (plan: MealPlan) => {
    try {
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      document.body.appendChild(element);

      // Render plan content
      const content = (
        <div className="p-8">
          {Object.entries(plan.weeklyPlan).map(([day, dayPlan]) => (
            <div key={day} className="mb-8">
              <h2 className="text-xl font-bold mb-4">{dayPlan.dayName}</h2>
              {/* Add meal sections here */}
            </div>
          ))}
        </div>
      );

      // Generate PDF
      await generateMealPlanPDF(element);
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-6">Histórico de Planos Alimentares</h2>
      
      {loading ? (
        <div className="text-center">Carregando histórico...</div>
      ) : plans.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          Nenhum plano alimentar gerado ainda
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">
                    Plano gerado em {format(new Date(plan.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Média diária: {Math.round(plan.weeklyTotals.averageCalories)} kcal
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(plan)}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(plan.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este plano alimentar? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
