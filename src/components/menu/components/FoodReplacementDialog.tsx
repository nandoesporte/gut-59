
import { useState, useEffect, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MealFood } from "../types";

interface FoodReplacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalFood: MealFood;
  dayKey: string;
  mealType: string;
  foodIndex: number;
  onFoodReplaced: (originalFood: MealFood, newFood: MealFood, dayKey: string, mealType: string, foodIndex: number) => void;
}

interface SuggestedFood {
  name: string;
  portion: number;
  unit: string;
  details: string;
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
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SuggestedFood[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedFood[]>([]);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const [customFood, setCustomFood] = useState<SuggestedFood>({
    name: "",
    portion: originalFood?.portion || 100,
    unit: originalFood?.unit || "g",
    details: ""
  });
  const [selectedOption, setSelectedOption] = useState<"suggestion" | "search" | "custom">("suggestion");

  useEffect(() => {
    if (open && originalFood) {
      generateSuggestions();
      setCustomFood({
        name: "",
        portion: originalFood.portion,
        unit: originalFood.unit,
        details: ""
      });
    }
  }, [open, originalFood]);

  const generateSuggestions = async () => {
    if (!originalFood) return;
    
    setLoading(true);
    try {
      // Get similar foods from database
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('name, food_group_id')
        .ilike('name', `%${originalFood.name.split(' ')[0]}%`)
        .limit(5);

      if (error) throw error;

      const defaultSuggestions: SuggestedFood[] = [
        {
          name: `${originalFood.name} grelhado`,
          portion: originalFood.portion,
          unit: originalFood.unit,
          details: `${originalFood.name} preparado na grelha com temperos naturais para realçar o sabor.`
        },
        {
          name: `${originalFood.name} cozido`,
          portion: originalFood.portion,
          unit: originalFood.unit,
          details: `${originalFood.name} cozido em água com ervas aromáticas para um sabor mais suave.`
        },
        {
          name: `${originalFood.name} assado`,
          portion: originalFood.portion,
          unit: originalFood.unit,
          details: `${originalFood.name} assado no forno com azeite e ervas para melhor preservar nutrientes.`
        }
      ];

      // Add database suggestions
      const dbSuggestions = data?.map(food => ({
        name: food.name,
        portion: originalFood.portion,
        unit: originalFood.unit,
        details: `${food.name} preparado de forma simples para manter suas propriedades nutricionais.`
      })) || [];

      // Combine and filter unique suggestions
      const allSuggestions = [...defaultSuggestions, ...dbSuggestions];
      const uniqueSuggestions = allSuggestions.filter(
        (suggestion, index, self) => 
          index === self.findIndex(s => s.name === suggestion.name)
      );

      setSuggestions(uniqueSuggestions.slice(0, 5));
      setSelectedFood(uniqueSuggestions[0]?.name || null);
    } catch (error) {
      console.error("Erro ao gerar sugestões:", error);
      toast.error("Não foi possível carregar as sugestões de substituição.");
    } finally {
      setLoading(false);
    }
  };

  const searchFoods = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('name')
        .ilike('name', `%${searchTerm}%`)
        .limit(5);

      if (error) throw error;

      const foods = data?.map(food => ({
        name: food.name,
        portion: originalFood.portion,
        unit: originalFood.unit,
        details: `${food.name} preparado de forma a preservar suas propriedades nutricionais.`
      })) || [];

      setSearchResults(foods);
      if (foods.length > 0) {
        setSelectedFood(foods[0].name);
      }
    } catch (error) {
      console.error("Erro na busca:", error);
      toast.error("Erro ao buscar alimentos");
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = () => {
    let newFood: MealFood;

    if (selectedOption === "suggestion" || selectedOption === "search") {
      const foodList = selectedOption === "suggestion" ? suggestions : searchResults;
      const selected = foodList.find(f => f.name === selectedFood);
      
      if (!selected) {
        toast.error("Por favor, selecione um alimento para substituição.");
        return;
      }
      
      newFood = {
        name: selected.name,
        portion: selected.portion,
        unit: selected.unit,
        details: selected.details
      };
    } else {
      // Custom food option
      if (!customFood.name.trim()) {
        toast.error("Por favor, informe o nome do alimento.");
        return;
      }
      
      newFood = {
        name: customFood.name,
        portion: customFood.portion,
        unit: customFood.unit,
        details: customFood.details || `${customFood.name} preparado conforme sua preferência pessoal.`
      };
    }

    onFoodReplaced(originalFood, newFood, dayKey, mealType, foodIndex);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Substituir Alimento</DialogTitle>
          <DialogDescription>
            Substituir {originalFood?.name} por outro alimento similar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <RadioGroup value={selectedOption} onValueChange={(value) => setSelectedOption(value as "suggestion" | "search" | "custom")}>
            <div className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value="suggestion" id="suggestion" />
              <Label htmlFor="suggestion">Usar uma sugestão</Label>
            </div>

            {selectedOption === "suggestion" && (
              <div className="ml-6 space-y-2">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : suggestions.length > 0 ? (
                  <RadioGroup value={selectedFood || ""} onValueChange={setSelectedFood}>
                    {suggestions.map((food, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={food.name} id={`suggestion-${index}`} />
                        <Label htmlFor={`suggestion-${index}`}>{food.name}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma sugestão disponível.</p>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2 mb-2 mt-4">
              <RadioGroupItem value="search" id="search" />
              <Label htmlFor="search">Buscar um alimento</Label>
            </div>

            {selectedOption === "search" && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Digite o nome do alimento"
                    className="flex-1"
                  />
                  <Button type="button" size="icon" onClick={searchFoods} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <RadioGroup value={selectedFood || ""} onValueChange={setSelectedFood} className="mt-2">
                    {searchResults.map((food, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={food.name} id={`search-${index}`} />
                        <Label htmlFor={`search-${index}`}>{food.name}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2 mb-2 mt-4">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom">Adicionar manualmente</Label>
            </div>

            {selectedOption === "custom" && (
              <div className="ml-6 space-y-3">
                <div>
                  <Label htmlFor="food-name">Nome do alimento</Label>
                  <Input
                    id="food-name"
                    value={customFood.name}
                    onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })}
                    placeholder="Ex: Frango grelhado"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="food-portion">Porção</Label>
                    <Input
                      id="food-portion"
                      type="number"
                      value={customFood.portion}
                      onChange={(e) => setCustomFood({ ...customFood, portion: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="food-unit">Unidade</Label>
                    <Input
                      id="food-unit"
                      value={customFood.unit}
                      onChange={(e) => setCustomFood({ ...customFood, unit: e.target.value })}
                      placeholder="Ex: g, ml, unidade"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="food-details">Instruções de preparo</Label>
                  <Textarea
                    id="food-details"
                    value={customFood.details}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCustomFood({ ...customFood, details: e.target.value })}
                    placeholder="Descreva como o alimento deve ser preparado"
                    className="min-h-20"
                  />
                </div>
              </div>
            )}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleReplace} disabled={loading}>Substituir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
