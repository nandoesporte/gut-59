
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Eye, Download } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  // Format the date
  const formattedDate = format(
    new Date(createdAt),
    "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
    { locale: ptBR }
  );

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <p className="text-sm text-gray-500">Criado em</p>
          <p className="font-medium">{formattedDate}</p>
          <p className="text-sm mt-1">
            <span className="font-semibold">{calories}</span> calorias diárias
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onView} 
            className="flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Visualizar</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDownload} 
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDelete} 
            className="flex items-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Excluir</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
