
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Egg, 
  Coffee, 
  Salad, 
  Apple, 
  Sandwich, 
  Pizza, 
  Fish,
  Carrot,
  Cherry,
  Grape,
  Banana,
  EggFried,
  IceCreamCone,
  Soup,
  Ham
} from "lucide-react";

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

const getFoodIcon = (name: string, size = 24) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('ovo')) return <Egg size={size} />;
  if (lowerName.includes('café')) return <Coffee size={size} />;
  if (lowerName.includes('salad')) return <Salad size={size} />;
  if (lowerName.includes('fruta')) return <Apple size={size} />;
  if (lowerName.includes('sandwich')) return <Sandwich size={size} />;
  if (lowerName.includes('pizza')) return <Pizza size={size} />;
  if (lowerName.includes('peixe')) return <Fish size={size} />;
  if (lowerName.includes('cenoura')) return <Carrot size={size} />;
  if (lowerName.includes('cereais')) return <Cherry size={size} />;
  if (lowerName.includes('uva')) return <Grape size={size} />;
  if (lowerName.includes('banana')) return <Banana size={size} />;
  if (lowerName.includes('frito')) return <EggFried size={size} />;
  if (lowerName.includes('sorvete')) return <IceCreamCone size={size} />;
  if (lowerName.includes('sopa')) return <Soup size={size} />;
  if (lowerName.includes('presunto')) return <Ham size={size} />;
  return <Apple size={size} />; // default icon
};

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
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Selecione seus Alimentos</h2>
        <p className="text-gray-600 mt-2">Escolha todos os alimentos que você gostaria de incluir no seu cardápio</p>
      </div>

      <ScrollArea className="h-[500px] w-full rounded-md border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {protocolFoods.map((food) => (
            <Button
              key={food.id}
              variant="outline"
              className={`
                h-auto w-full p-4 flex flex-col items-center gap-3 transition-all duration-200
                ${selectedFoods.includes(food.id) 
                  ? 'bg-primary/10 border-primary ring-2 ring-primary/20' 
                  : 'hover:bg-gray-50'
                }
              `}
              onClick={() => onFoodSelection(food.id)}
            >
              <div className={`
                p-3 rounded-full 
                ${selectedFoods.includes(food.id) 
                  ? 'bg-primary/20' 
                  : 'bg-gray-100'
                }
              `}>
                {getFoodIcon(food.name)}
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="font-medium text-sm">{food.name}</h3>
                
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {food.calories} kcal
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    P: {food.protein}g
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    C: {food.carbs}g
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    G: {food.fats}g
                  </Badge>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>

      <div className="bg-primary-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-primary-900">Total de Calorias Selecionadas</h3>
            <p className="text-sm text-primary-700">
              {selectedFoods.length} itens selecionados
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
        <Button 
          disabled={selectedFoods.length === 0} 
          onClick={onConfirm}
          className="bg-primary hover:bg-primary-600"
        >
          Confirmar Seleção
        </Button>
      </div>
    </div>
  );
};
