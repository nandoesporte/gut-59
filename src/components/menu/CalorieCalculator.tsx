
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HealthConditionCards, type HealthCondition } from "./HealthConditionCards";

export interface CalorieCalculatorForm {
  weight: number;
  height: number;
  age: number;
  gender: "male" | "female";
  activityLevel: string;
  goal: string;
  healthCondition: HealthCondition | null;
}

interface CalorieCalculatorProps {
  formData: CalorieCalculatorForm;
  onInputChange: (field: keyof CalorieCalculatorForm, value: string | number | null) => void;
  onCalculate: () => void;
  calorieNeeds: number | null;
}

export const activityLevels = {
  sedentary: { label: "Sedentário (Pouca ou nenhuma atividade física)", factor: 1.2 },
  lightlyActive: { label: "Levemente ativo (Exercício leve 1-3 dias/semana)", factor: 1.375 },
  moderatelyActive: { label: "Moderadamente ativo (Exercício moderado 3-5 dias/semana)", factor: 1.55 },
  veryActive: { label: "Muito ativo (Exercício intenso 6-7 dias/semana)", factor: 1.725 },
  extremelyActive: { label: "Extremamente ativo (Treinos diários e/ou trabalho físico pesado)", factor: 1.9 },
};

export const goals = {
  lose: { label: "Perder peso", factor: 0.8 },
  maintain: { label: "Manter peso", factor: 1 },
  gain: { label: "Ganhar peso (massa muscular)", factor: 1.2 },
};

export const CalorieCalculator = ({
  formData,
  onInputChange,
  onCalculate,
  calorieNeeds,
}: CalorieCalculatorProps) => {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <HealthConditionCards
          selectedCondition={formData.healthCondition}
          onSelect={(condition) => onInputChange("healthCondition", condition)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label htmlFor="weight">Peso (kg)</Label>
          <Input
            id="weight"
            type="number"
            placeholder="Ex: 70"
            value={formData.weight || ""}
            onChange={(e) => onInputChange("weight", Number(e.target.value))}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="height">Altura (cm)</Label>
          <Input
            id="height"
            type="number"
            placeholder="Ex: 170"
            value={formData.height || ""}
            onChange={(e) => onInputChange("height", Number(e.target.value))}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="age">Idade</Label>
          <Input
            id="age"
            type="number"
            placeholder="Ex: 30"
            value={formData.age || ""}
            onChange={(e) => onInputChange("age", Number(e.target.value))}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="gender">Sexo</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => onInputChange("gender", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o sexo" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="female">Feminino</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <Label htmlFor="activityLevel">Nível de Atividade Física</Label>
          <Select
            value={formData.activityLevel}
            onValueChange={(value) => onInputChange("activityLevel", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o nível de atividade" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.entries(activityLevels).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <Label htmlFor="goal">Objetivo</Label>
          <Select
            value={formData.goal}
            onValueChange={(value) => onInputChange("goal", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione seu objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.entries(goals).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-center">
        <Button onClick={onCalculate} className="w-full md:w-auto">
          Calcular Calorias
        </Button>
      </div>

      {calorieNeeds && (
        <div className="mt-6 p-4 bg-primary-50 rounded-lg text-center">
          <h3 className="text-xl font-semibold text-primary-700">
            Suas Necessidades Calóricas Diárias
          </h3>
          <p className="text-2xl font-bold text-primary-900 mt-2">
            {calorieNeeds} calorias
          </p>
          <p className="text-sm text-primary-600 mt-2">
            Este é um cálculo estimado baseado nas informações fornecidas.
            Consulte um profissional da saúde para recomendações personalizadas.
          </p>
        </div>
      )}
    </div>
  );
};
