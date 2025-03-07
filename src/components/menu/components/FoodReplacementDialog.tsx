
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { MealFood, ProtocolFood } from "../types";
import { supabase } from "@/integrations/supabase/client";

interface FoodReplacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalFood: MealFood;
  dayKey: string;
  mealType: string;
  foodIndex: number;
  onFoodReplaced: (
    originalFood: MealFood,
    newFood: MealFood,
    dayKey: string,
    mealType: string,
    foodIndex: number
  ) => void;
}

export const FoodReplacementDialog = ({
  open,
  onOpenChange,
  originalFood,
  dayKey,
  mealType,
  foodIndex,
  onFoodReplaced
}: FoodReplacementDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestedFoods, setSuggestedFoods] = useState<ProtocolFood[]>([]);
  const [selectedFood, setSelectedFood] = useState<ProtocolFood | null>(null);
  const [customPreparation, setCustomPreparation] = useState(originalFood.details || "");

  // Fetch alternative food suggestions
  useEffect(() => {
    if (open) {
      fetchSuggestedFoods();
    }
  }, [open]);

  const fetchSuggestedFoods = async () => {
    try {
      setLoading(true);
      
      // Determine the meal type for API categorization
      let mealTypeForAPI = "";
      switch (mealType) {
        case "breakfast": mealTypeForAPI = "breakfast"; break;
        case "morningSnack": mealTypeForAPI = "morning_snack"; break;
        case "lunch": mealTypeForAPI = "lunch"; break;
        case "afternoonSnack": mealTypeForAPI = "afternoon_snack"; break;
        case "dinner": mealTypeForAPI = "dinner"; break;
        default: mealTypeForAPI = "any";
      }

      // Fetch alternative foods based on meal type
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('*')
        .contains('meal_type', [mealTypeForAPI])
        .limit(10);

      if (error) {
        throw error;
      }

      setSuggestedFoods(data || []);
    } catch (error) {
      console.error("Erro ao buscar alimentos alternativos:", error);
      toast.error("Erro ao buscar sugestões de alimentos");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Digite um termo para buscar");
      return;
    }

    try {
      setLoading(true);
      
      // Search foods by name
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .limit(10);

      if (error) {
        throw error;
      }

      setSuggestedFoods(data || []);
      
      if (data && data.length === 0) {
        toast.info("Nenhum alimento encontrado com esse termo");
      }
    } catch (error) {
      console.error("Erro na busca de alimentos:", error);
      toast.error("Erro ao buscar alimentos");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFood = (food: ProtocolFood) => {
    setSelectedFood(food);
    // Initialize with default preparation instructions
    setCustomPreparation(`Prepare ${food.name} conforme sua preferência.`);
  };

  const handleReplaceFood = () => {
    if (!selectedFood) {
      toast.error("Selecione um alimento para substituir");
      return;
    }

    // Create new food object with selected food data
    const newFood: MealFood = {
      name: selectedFood.name,
      portion: selectedFood.portion_size || 100,
      unit: selectedFood.portion_unit || "g",
      details: customPreparation
    };

    onFoodReplaced(originalFood, newFood, dayKey, mealType, foodIndex);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Substituir Alimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Alimento Atual:</h3>
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold">{originalFood.name}</p>
                <p className="text-sm text-gray-600">{originalFood.portion} {originalFood.unit}</p>
                <p className="text-sm mt-2">{originalFood.details}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center space-x-2">
            <Input
              placeholder="Buscar alimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Sugestões de alimentos alternativos:</h3>
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {suggestedFoods.map((food) => (
                  <Card 
                    key={food.id}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedFood?.id === food.id ? 'border-primary border-2' : ''
                    }`}
                    onClick={() => handleSelectFood(food)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{food.name}</p>
                          <p className="text-xs text-gray-500">
                            {food.calories} kcal | P: {food.protein}g | C: {food.carbs}g | G: {food.fats}g
                          </p>
                        </div>
                        <div>
                          <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                            {food.portion_size || 100}{food.portion_unit || 'g'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {suggestedFoods.length === 0 && !loading && (
                  <p className="text-center text-gray-500 py-4">
                    Nenhum alimento encontrado. Tente uma busca diferente.
                  </p>
                )}
              </div>
            )}
          </div>

          {selectedFood && (
            <div>
              <h3 className="text-sm font-medium mb-2">Modo de preparo personalizado:</h3>
              <Input
                as="textarea"
                className="min-h-[80px]"
                value={customPreparation}
                onChange={(e) => setCustomPreparation(e.target.value)}
                placeholder="Descreva como preparar este alimento..."
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleReplaceFood}
            disabled={!selectedFood}
          >
            Substituir Alimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
