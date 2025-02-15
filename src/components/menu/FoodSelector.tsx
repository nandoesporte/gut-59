
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Coffee, Utensils, Apple, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  food_group_id: number;
}

interface FoodSelectorProps {
  protocolFoods: ProtocolFood[];
  selectedFoods: string[];
  onFoodSelection: (foodId: string) => void;
  totalCalories: number;
  onBack: () => void;
  onConfirm: () => void;
}

const MealSection = ({
  title,
  icon,
  foods,
  selectedFoods,
  onFoodSelection
}: {
  title: string;
  icon: React.ReactNode;
  foods: ProtocolFood[];
  selectedFoods: string[];
  onFoodSelection: (foodId: string) => void;
}) => (
  <Card className="p-4 space-y-3">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h3 className="font-medium text-gray-900">{title}</h3>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {foods.map((food) => (
        <Button
          key={food.id}
          variant={selectedFoods.includes(food.id) ? "default" : "outline"}
          onClick={() => onFoodSelection(food.id)}
          className={`h-auto py-2 px-3 text-sm justify-start ${
            selectedFoods.includes(food.id) 
              ? 'bg-primary/10 border-primary text-primary' 
              : ''
          }`}
        >
          {food.name}
        </Button>
      ))}
    </div>
  </Card>
);

export const FoodSelector = ({
  protocolFoods,
  selectedFoods,
  onFoodSelection,
  totalCalories,
  onBack,
  onConfirm,
}: FoodSelectorProps) => {
  // Organizar alimentos por grupo
  const breakfastFoods = protocolFoods.filter(food => food.food_group_id === 1);
  const lunchFoods = protocolFoods.filter(food => food.food_group_id === 2);
  const snackFoods = protocolFoods.filter(food => food.food_group_id === 3);
  const dinnerFoods = protocolFoods.filter(food => food.food_group_id === 4);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Monte seu Cardápio</h2>
        <p className="text-gray-600 mt-2">
          Selecione os alimentos para cada refeição do seu dia
        </p>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-6">
          <MealSection
            title="Café da manhã"
            icon={<Coffee className="h-5 w-5 text-primary" />}
            foods={breakfastFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={onFoodSelection}
          />

          <MealSection
            title="Almoço"
            icon={<Utensils className="h-5 w-5 text-primary" />}
            foods={lunchFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={onFoodSelection}
          />

          <MealSection
            title="Lanche da Manhã e Tarde"
            icon={<Apple className="h-5 w-5 text-primary" />}
            foods={snackFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={onFoodSelection}
          />

          <MealSection
            title="Jantar"
            icon={<Moon className="h-5 w-5 text-primary" />}
            foods={dinnerFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={onFoodSelection}
          />
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 bg-white border-t pt-4 mt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="font-medium text-gray-900">Total selecionado</p>
            <p className="text-sm text-gray-600">
              {selectedFoods.length} alimentos
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {totalCalories} kcal
          </Badge>
        </div>

        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button 
            disabled={selectedFoods.length === 0} 
            onClick={onConfirm}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            Confirmar Seleção
          </Button>
        </div>
      </div>
    </div>
  );
};
