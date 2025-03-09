
import { List } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { MealPlanCard } from './MealPlanCard';
import { MealPlan } from '../types';
import { generateMealPlanPDF } from '../utils/pdf-generator';
import { toast } from 'sonner';

interface MealPlanListProps {
  plans: Array<{
    id: string;
    created_at: string;
    plan_data: MealPlan;
    calories: number;
  }>;
  loading: boolean;
  onViewDetails: (planId: string, planData: MealPlan) => void;
  onDeletePlan: (planId: string) => void;
}

export const MealPlanList = ({
  plans,
  loading,
  onViewDetails,
  onDeletePlan
}: MealPlanListProps) => {
  const handleDownload = async (plan: { plan_data: MealPlan }) => {
    try {
      await generateMealPlanPDF(plan.plan_data);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  if (loading) {
    return <div className="text-center">Carregando histórico...</div>;
  }

  if (plans.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Nenhum plano alimentar gerado ainda
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {plans.map((plan) => (
        <MealPlanCard
          key={plan.id}
          id={plan.id}
          createdAt={plan.created_at}
          calories={plan.calories}
          onView={() => onViewDetails(plan.id, plan.plan_data)}
          onDownload={() => handleDownload(plan)}
          onDelete={() => onDeletePlan(plan.id)}
        />
      ))}
    </div>
  );
};
