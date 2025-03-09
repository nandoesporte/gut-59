
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Eye, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MealPlan } from '../types';

interface MealPlanCardProps {
  id: string;
  createdAt: string;
  calories: number;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export const MealPlanCard = ({
  id,
  createdAt,
  calories,
  onView,
  onDownload,
  onDelete
}: MealPlanCardProps) => {
  return (
    <Card key={id} className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div>
          <h3 className="font-semibold text-sm sm:text-base">
            Plano gerado em {format(new Date(createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Média diária: {Math.round(calories)} kcal
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex-1 sm:flex-initial justify-center min-w-[80px]"
          >
            <Eye className="w-4 h-4 mr-2" />
            <span className="sm:inline">Detalhes</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="flex-1 sm:flex-initial justify-center min-w-[80px]"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="sm:inline">Baixar PDF</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="flex-1 sm:flex-initial justify-center min-w-[80px] text-red-500 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            <span className="sm:inline">Excluir</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
