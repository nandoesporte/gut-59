
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface FoodSelectorProps {
  protocolFoods: ProtocolFood[];
  selectedFoods: string[];
  onFoodSelection: (foodId: string) => void;
  totalCalories: number;
  onBack: () => void;
  onConfirm: () => void;
}

export const FoodSelector = ({
  protocolFoods,
  selectedFoods,
  onFoodSelection,
  totalCalories,
  onBack,
  onConfirm,
}: FoodSelectorProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Selecione seu Café da Manhã</h2>
        <p className="text-gray-600 mt-2">Escolha até 5 opções para seu café da manhã</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {protocolFoods.map((food) => (
          <div
            key={food.id}
            className={`p-4 border rounded-lg flex items-center justify-between ${
              selectedFoods.includes(food.id) ? 'bg-primary-50 border-primary-200' : 'bg-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Checkbox
                id={food.id}
                checked={selectedFoods.includes(food.id)}
                onCheckedChange={() => onFoodSelection(food.id)}
                disabled={selectedFoods.length >= 5 && !selectedFoods.includes(food.id)}
              />
              <div>
                <Label htmlFor={food.id} className="text-sm font-medium">
                  {food.name}
                </Label>
                <p className="text-xs text-gray-500">
                  {food.calories} kcal | P: {food.protein}g | C: {food.carbs}g | G: {food.fats}g
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-primary-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-primary-900">Total de Calorias Selecionadas</h3>
            <p className="text-sm text-primary-700">
              {selectedFoods.length}/5 itens selecionados
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {totalCalories} kcal
          </Badge>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button disabled={selectedFoods.length === 0} onClick={onConfirm}>
          Confirmar Seleção
        </Button>
      </div>
    </div>
  );
};
