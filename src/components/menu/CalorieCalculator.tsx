
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Scale, Activity, Footprints, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalorieCalculatorForm {
  weight: string;
  height: string;
  age: string;
  gender: "male" | "female";
  activityLevel: string;
}

interface CalorieCalculatorProps {
  formData: CalorieCalculatorForm;
  onInputChange: (field: keyof CalorieCalculatorForm, value: string) => void;
  onCalculate: () => void;
  calorieNeeds: number | null;
}

export const activityLevels = [
  {
    value: "sedentary",
    label: "Sedentário",
    description: "Pouco ou nenhum exercício",
    icon: Scale,
    multiplier: 1.2
  },
  {
    value: "lightlyActive",
    label: "Levemente Ativo",
    description: "Exercício leve ou caminhada (1-3 dias/semana)",
    icon: Activity,
    multiplier: 1.375
  },
  {
    value: "moderatelyActive",
    label: "Moderadamente Ativo",
    description: "Exercício moderado (3-5 dias/semana)",
    icon: Footprints,
    multiplier: 1.55
  },
  {
    value: "veryActive",
    label: "Muito Ativo",
    description: "Exercício intenso (6-7 dias/semana)",
    icon: Dumbbell,
    multiplier: 1.725
  }
];

const CalorieCalculator = ({
  formData,
  onInputChange,
  onCalculate,
  calorieNeeds,
}: CalorieCalculatorProps) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 bg-white shadow-md border border-green-100">
          <form onSubmit={(e) => {
            e.preventDefault();
            onCalculate();
          }}>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => onInputChange("weight", e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => onInputChange("height", e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="age">Idade</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => onInputChange("age", e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gênero</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => onInputChange("gender", value)}
                  >
                    <SelectTrigger id="gender" className="mt-1">
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Nível de Atividade</Label>
                <div className="grid gap-2 mt-1">
                  {activityLevels.map((level) => (
                    <Card
                      key={level.value}
                      className={cn(
                        "relative flex items-center space-x-2 p-3 sm:p-4 cursor-pointer transition-colors",
                        formData.activityLevel === level.value
                          ? "bg-green-50 border-green-200"
                          : "hover:bg-green-50/50"
                      )}
                      onClick={() => onInputChange("activityLevel", level.value)}
                    >
                      <level.icon className={cn(
                        "w-4 h-4 sm:w-5 sm:h-5",
                        formData.activityLevel === level.value
                          ? "text-green-600"
                          : "text-gray-500"
                      )} />
                      <div className="flex-1">
                        <p className="text-sm sm:text-base font-medium">{level.label}</p>
                        <p className="text-xs sm:text-sm text-gray-500">{level.description}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white mt-4"
              >
                Calcular Necessidades Calóricas
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export { CalorieCalculator };
