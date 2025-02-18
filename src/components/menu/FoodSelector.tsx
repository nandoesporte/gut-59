
import { Button } from "@/components/ui/button";
import { Coffee, Utensils, Apple, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  food_group_id: number;
  portion_size?: number;
  portion_unit?: string;
  serving_size?: number;
  serving_unit?: string;
}

interface FoodSelectorProps {
  protocolFoods: ProtocolFood[];
  selectedFoods: string[];
  onFoodSelection: (foodId: string) => void;
  totalCalories: number;
  onBack: () => void;
  onConfirm: () => void;
}

// Função para formatar a porção do alimento de forma profissional
const formatPortion = (food: ProtocolFood): string => {
  const size = food.serving_size || food.portion_size || 100;
  const unit = food.serving_unit || food.portion_unit || 'g';
  
  // Mapeamento de medidas caseiras
  const householdMeasures: Record<string, (size: number) => string> = {
    'xícara': (size) => size === 0.5 ? '½ xícara' : `${size} xícara${size > 1 ? 's' : ''}`,
    'colher': (size) => `${size} colher${size > 1 ? 'es' : ''} de sopa`,
    'fatia': (size) => `${size} fatia${size > 1 ? 's' : ''}`,
    'unidade': (size) => `${size} unidade${size > 1 ? 's' : ''}`,
    'prato': (size) => `${size} prato${size > 1 ? 's' : ''}`,
    'porção': (size) => `${size} porção${size > 1 ? 'ões' : ''}`,
  };

  if (unit.toLowerCase().includes('xic')) return householdMeasures['xícara'](size);
  if (unit.toLowerCase().includes('colh')) return householdMeasures['colher'](size);
  if (unit.toLowerCase().includes('fat')) return householdMeasures['fatia'](size);
  if (unit.toLowerCase().includes('unid')) return householdMeasures['unidade'](size);
  if (unit.toLowerCase().includes('prat')) return householdMeasures['prato'](size);
  if (unit.toLowerCase().includes('porc')) return householdMeasures['porção'](size);

  // Para medidas em gramas, formatar de maneira profissional
  if (unit.toLowerCase() === 'g') {
    if (size < 1) return `${size * 1000}mg`;
    if (size >= 1000) return `${size / 1000}kg`;
    return `${size}g`;
  }

  // Para medidas em mililitros
  if (unit.toLowerCase() === 'ml') {
    if (size >= 1000) return `${size / 1000}L`;
    return `${size}ml`;
  }

  return `${size}${unit}`;
};

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
    <div className="flex flex-wrap gap-2">
      {foods.map((food) => (
        <Button
          key={food.id}
          variant={selectedFoods.includes(food.id) ? "default" : "outline"}
          onClick={() => onFoodSelection(food.id)}
          className={`
            inline-flex items-center justify-center whitespace-nowrap h-auto py-1.5 px-3 text-sm
            ${selectedFoods.includes(food.id)
              ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200 hover:text-green-800'
              : 'hover:bg-green-50 hover:border-green-200'}
          `}
        >
          {food.name} ({formatPortion(food)})
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
  const handleConfirm = async () => {
    if (selectedFoods.length === 0) {
      toast.error("Selecione pelo menos um alimento");
      return;
    }

    onConfirm();
  };

  // Organizar alimentos por grupo
  const breakfastFoods = protocolFoods.filter(food => food.food_group_id === 1);
  const lunchFoods = protocolFoods.filter(food => food.food_group_id === 2);
  const snackFoods = protocolFoods.filter(food => food.food_group_id === 3);
  const dinnerFoods = protocolFoods.filter(food => food.food_group_id === 4);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Opções de Preferência dos Alimentos</h2>
        <p className="text-gray-600 mt-2">
          Selecione suas preferências alimentares para cada refeição, as porções foram cuidadosamente estabelecidas por Dr. Michael Anderson, PhD em Nutrição Clínica
        </p>
      </div>

      <div className="space-y-6">
        <MealSection
          title="Café da manhã"
          icon={<Coffee className="h-5 w-5 text-green-600" />}
          foods={breakfastFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
        />

        <MealSection
          title="Almoço"
          icon={<Utensils className="h-5 w-5 text-green-600" />}
          foods={lunchFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
        />

        <MealSection
          title="Lanche da Manhã e Tarde"
          icon={<Apple className="h-5 w-5 text-green-600" />}
          foods={snackFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
        />

        <MealSection
          title="Jantar"
          icon={<Moon className="h-5 w-5 text-green-600" />}
          foods={dinnerFoods}
          selectedFoods={selectedFoods}
          onFoodSelection={onFoodSelection}
        />
      </div>

      <div className="sticky bottom-0 bg-white border-t pt-4 mt-6">
        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button 
            disabled={selectedFoods.length === 0} 
            onClick={handleConfirm}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            Confirmar Seleção ({selectedFoods.length} alimentos)
          </Button>
        </div>
      </div>
    </div>
  );
};
