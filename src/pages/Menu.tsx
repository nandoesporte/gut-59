
import { useState } from "react";
import { Card } from "@/components/ui/card";
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
import { toast } from "sonner";

interface CalorieCalculatorForm {
  weight: number;
  height: number;
  age: number;
  gender: "male" | "female";
  activityLevel: string;
  goal: string;
}

const Menu = () => {
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);
  const [formData, setFormData] = useState<CalorieCalculatorForm>({
    weight: 0,
    height: 0,
    age: 0,
    gender: "male",
    activityLevel: "",
    goal: "",
  });

  const activityLevels = {
    sedentary: { label: "Sedentário (Pouca ou nenhuma atividade física)", factor: 1.2 },
    lightlyActive: { label: "Levemente ativo (Exercício leve 1-3 dias/semana)", factor: 1.375 },
    moderatelyActive: { label: "Moderadamente ativo (Exercício moderado 3-5 dias/semana)", factor: 1.55 },
    veryActive: { label: "Muito ativo (Exercício intenso 6-7 dias/semana)", factor: 1.725 },
    extremelyActive: { label: "Extremamente ativo (Treinos diários e/ou trabalho físico pesado)", factor: 1.9 },
  };

  const goals = {
    lose: { label: "Perder peso", factor: 0.8 },
    maintain: { label: "Manter peso", factor: 1 },
    gain: { label: "Ganhar peso (massa muscular)", factor: 1.2 },
  };

  const calculateBMR = (data: CalorieCalculatorForm) => {
    if (data.gender === "male") {
      return 88.36 + (13.4 * data.weight) + (4.8 * data.height) - (5.7 * data.age);
    } else {
      return 447.6 + (9.2 * data.weight) + (3.1 * data.height) - (4.3 * data.age);
    }
  };

  const calculateCalories = () => {
    if (!formData.activityLevel || !formData.goal) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    const bmr = calculateBMR(formData);
    const activityFactor = activityLevels[formData.activityLevel as keyof typeof activityLevels].factor;
    const goalFactor = goals[formData.goal as keyof typeof goals].factor;
    const dailyCalories = Math.round(bmr * activityFactor * goalFactor);

    setCalorieNeeds(dailyCalories);
    toast.success("Cálculo realizado com sucesso!");
  };

  const handleInputChange = (field: keyof CalorieCalculatorForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-primary">Cardápio Personalizado</h1>
          <p className="text-gray-600">
            Calcule suas necessidades calóricas diárias para atingir seus objetivos
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="Ex: 70"
                value={formData.weight || ""}
                onChange={(e) => handleInputChange("weight", Number(e.target.value))}
              />
            </div>

            <div className="space-y-4">
              <Label htmlFor="height">Altura (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="Ex: 170"
                value={formData.height || ""}
                onChange={(e) => handleInputChange("height", Number(e.target.value))}
              />
            </div>

            <div className="space-y-4">
              <Label htmlFor="age">Idade</Label>
              <Input
                id="age"
                type="number"
                placeholder="Ex: 30"
                value={formData.age || ""}
                onChange={(e) => handleInputChange("age", Number(e.target.value))}
              />
            </div>

            <div className="space-y-4">
              <Label htmlFor="gender">Sexo</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleInputChange("gender", value)}
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
                onValueChange={(value) => handleInputChange("activityLevel", value)}
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
                onValueChange={(value) => handleInputChange("goal", value)}
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

          <div className="flex justify-center pt-4">
            <Button onClick={calculateCalories} className="w-full md:w-auto">
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
        </Card>
      </div>
    </div>
  );
};

export default Menu;
