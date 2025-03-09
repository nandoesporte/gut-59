
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProtocolFood } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";

interface FoodSelectorProps {
  protocolFoods: ProtocolFood[];
  selectedFoods: ProtocolFood[];
  onFoodSelection: (food: ProtocolFood) => void;
  totalCalories: number;
  onConfirm: () => void;
  onBack: () => void;
}

export const FoodSelector = ({
  protocolFoods,
  selectedFoods,
  onFoodSelection,
  totalCalories,
  onConfirm,
  onBack
}: FoodSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFoods, setFilteredFoods] = useState<ProtocolFood[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();

  // Group foods by food group
  const groupedFoods = protocolFoods.reduce<Record<string, ProtocolFood[]>>((groups, food) => {
    const group = food.food_group_name || "Outros";
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(food);
    return groups;
  }, {});

  // Update filtered foods when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredFoods(protocolFoods);
      return;
    }

    const normalized = searchTerm.toLowerCase().trim();
    const filtered = protocolFoods.filter(food => 
      food.name.toLowerCase().includes(normalized)
    );
    
    setFilteredFoods(filtered);
  }, [searchTerm, protocolFoods]);

  // Initialize all groups as expanded
  useEffect(() => {
    const groups: Record<string, boolean> = {};
    Object.keys(groupedFoods).forEach(group => {
      groups[group] = true;
    });
    setExpandedGroups(groups);
  }, [groupedFoods]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const isSelected = (food: ProtocolFood) => {
    return selectedFoods.some(selected => selected.id === food.id);
  };

  // Filter and organize foods
  const getFoodsToDisplay = () => {
    if (searchTerm.trim() !== "") {
      return { "Resultados da Busca": filteredFoods };
    }
    return groupedFoods;
  };

  const foodsToDisplay = getFoodsToDisplay();

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar alimentos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between mb-4">
        <div className="mb-2 sm:mb-0">
          <h3 className="text-lg font-medium">Alimentos selecionados: {selectedFoods.length}</h3>
          <p className="text-sm text-gray-600">Calorias estimadas: {totalCalories} kcal</p>
        </div>
        <div className="space-x-2 flex">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-gray-300 text-gray-700"
          >
            Voltar
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={selectedFoods.length === 0}
          >
            Continuar
          </Button>
        </div>
      </div>

      {/* Selected Foods */}
      {selectedFoods.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Alimentos Selecionados</h3>
          <div className="flex flex-wrap gap-2">
            {selectedFoods.map(food => (
              <span
                key={food.id}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center"
              >
                {food.name}
                <button
                  className="ml-1 text-green-600 hover:text-green-800"
                  onClick={() => onFoodSelection(food)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Food Groups and Items */}
      <div className="space-y-4">
        {Object.entries(foodsToDisplay).length === 0 ? (
          <p className="text-center py-4 text-gray-500">Nenhum alimento encontrado para "{searchTerm}".</p>
        ) : (
          Object.entries(foodsToDisplay).map(([group, foods]) => (
            <Card key={group} className="overflow-hidden">
              <div
                className="p-4 bg-gray-50 border-b border-gray-200 cursor-pointer flex justify-between items-center"
                onClick={() => toggleGroup(group)}
              >
                <h3 className="font-medium">{group} ({foods.length})</h3>
                <span>{expandedGroups[group] ? '▲' : '▼'}</span>
              </div>
              
              {expandedGroups[group] && (
                <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {foods.map(food => (
                    <div
                      key={food.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected(food)
                          ? 'bg-green-100 border border-green-300'
                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => onFoodSelection(food)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{food.name}</h4>
                          <p className="text-xs text-gray-600">
                            {food.calories} kcal | P: {food.protein}g | C: {food.carbs}g | G: {food.fats}g
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected(food)
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300'
                        }`}>
                          {isSelected(food) && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-gray-300 text-gray-700"
        >
          Voltar
        </Button>
        <Button
          variant="default"
          onClick={onConfirm}
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={selectedFoods.length === 0}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};
