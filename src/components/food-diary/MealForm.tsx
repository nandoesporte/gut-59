
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FoodSelector } from "./FoodSelector";

interface MealType {
  id: number;
  name: string;
  display_name: string;
  phase: number | null;
}

interface FoodGroup {
  id: number;
  name: string;
  display_name: string;
}

interface ProtocolFood {
  id: string;
  name: string;
  food_group: string;
  food_group_id: number;
  phase: number;
  phase_id: number;
}

interface MealFormProps {
  loading: boolean;
  mealTypes: MealType[];
  foodGroups: FoodGroup[];
  protocolFoods: ProtocolFood[];
  onSubmit: () => void;
  mealType: string;
  setMealType: (value: string) => void;
  phase: string;
  setPhase: (value: string) => void;
  selectedFood: string;
  setSelectedFood: (value: string) => void;
  date: Date;
  setDate: (value: Date) => void;
  selectedFoodGroup: number | null;
  setSelectedFoodGroup: (value: number | null) => void;
  customFood: string;
  setCustomFood: (value: string) => void;
  showCustomFood: boolean;
  setShowCustomFood: (value: boolean) => void;
}

export const MealForm = ({
  loading,
  mealTypes,
  foodGroups,
  protocolFoods,
  onSubmit,
  mealType,
  setMealType,
  phase,
  setPhase,
  selectedFood,
  setSelectedFood,
  date,
  setDate,
  selectedFoodGroup,
  setSelectedFoodGroup,
  customFood,
  setCustomFood,
  showCustomFood,
  setShowCustomFood,
}: MealFormProps) => {
  return (
    <Card className="bg-white shadow-sm border-none">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900">Nova Refeição</h2>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="w-full bg-gray-50 border-gray-200">
              <SelectValue placeholder="Selecione a refeição" />
            </SelectTrigger>
            <SelectContent>
              {mealTypes.map((type) => (
                <SelectItem key={type.id} value={type.name}>
                  {type.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fase do Protocolo
              </label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Selecione a fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Fase 1 - Remoção e Desintoxicação</SelectItem>
                  <SelectItem value="2">Fase 2 - Reequilíbrio da Microbiota</SelectItem>
                  <SelectItem value="3">Fase 3 - Reparo e Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grupo Alimentar
              </label>
              <Select 
                value={selectedFoodGroup?.toString() || ""} 
                onValueChange={(value) => setSelectedFoodGroup(Number(value))}
              >
                <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Selecione o grupo alimentar" />
                </SelectTrigger>
                <SelectContent>
                  {foodGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FoodSelector
              protocolFoods={protocolFoods}
              phase={phase}
              selectedFoodGroup={selectedFoodGroup}
              selectedFood={selectedFood}
              onSelectFood={setSelectedFood}
              showCustomFood={showCustomFood}
              customFood={customFood}
              onCustomFoodChange={setCustomFood}
              onToggleCustomFood={() => setShowCustomFood(!showCustomFood)}
            />
          </div>

          <Button
            onClick={onSubmit}
            disabled={loading || !mealType || (!selectedFood && !customFood) || !selectedFoodGroup}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white"
          >
            {loading ? "Registrando..." : "Registrar Refeição"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
