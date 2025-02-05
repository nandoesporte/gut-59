import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { UtensilsCrossed } from "lucide-react";

const FoodDiary = () => {
  const { toast } = useToast();

  const handleFoodLog = () => {
    toast({
      title: "Refeição registrada",
      description: "Seu registro alimentar foi salvo com sucesso.",
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center space-x-2">
        <UtensilsCrossed className="w-6 h-6 text-primary-500" />
        <CardTitle className="text-2xl text-primary-500">
          Diário Alimentar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Refeição
            </label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
              <option>Café da manhã</option>
              <option>Almoço</option>
              <option>Lanche</option>
              <option>Jantar</option>
              <option>Ceia</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Alimentos Consumidos
            </label>
            <textarea
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              rows={3}
              placeholder="Liste os alimentos consumidos"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Horário
            </label>
            <input
              type="time"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Observações
            </label>
            <textarea
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              rows={2}
              placeholder="Adicione observações sobre a refeição"
            />
          </div>
        </div>
        <Button
          onClick={handleFoodLog}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white"
        >
          Registrar Refeição
        </Button>
      </CardContent>
    </Card>
  );
};

export default FoodDiary;