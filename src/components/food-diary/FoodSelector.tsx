
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ProtocolFood {
  id: string;
  name: string;
  food_group: string;
  food_group_id: number;
  phase: number;
  phase_id: number;
}

interface FoodSelectorProps {
  protocolFoods: ProtocolFood[];
  phase: string;
  selectedFoodGroup: number | null;
  selectedFood: string;
  onSelectFood: (foodId: string) => void;
  showCustomFood: boolean;
  customFood: string;
  onCustomFoodChange: (value: string) => void;
  onToggleCustomFood: () => void;
}

export const FoodSelector = ({
  protocolFoods,
  phase,
  selectedFoodGroup,
  selectedFood,
  onSelectFood,
  showCustomFood,
  customFood,
  onCustomFoodChange,
  onToggleCustomFood,
}: FoodSelectorProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Alimentos
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCustomFood}
          className="text-primary-600 hover:text-primary-700"
        >
          {showCustomFood ? "Escolher dos alimentos permitidos" : "Adicionar alimento personalizado"}
        </Button>
      </div>

      {showCustomFood ? (
        <Input
          placeholder="Digite o nome do alimento"
          value={customFood}
          onChange={(e) => onCustomFoodChange(e.target.value)}
          className="w-full"
        />
      ) : (
        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
          <div className="space-y-2">
            {protocolFoods
              .filter(food => 
                (!phase || food.phase === parseInt(phase)) &&
                (!selectedFoodGroup || food.food_group_id === selectedFoodGroup)
              )
              .map((food) => (
                <div
                  key={food.id}
                  className={cn(
                    "flex items-center space-x-2 rounded-lg p-2 cursor-pointer hover:bg-gray-100",
                    selectedFood === food.id && "bg-primary-50"
                  )}
                  onClick={() => onSelectFood(food.id)}
                >
                  <div className="w-2 h-2 rounded-full bg-primary-300" />
                  <span className="text-sm text-gray-700">{food.name}</span>
                </div>
              ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
