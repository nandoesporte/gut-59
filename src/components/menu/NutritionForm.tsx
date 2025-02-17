
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { NutritionPreferences } from "./types";
import { GoalCards, type Goal } from "./GoalCards";
import { HealthConditionCards, type HealthCondition } from "./HealthConditionCards";

interface NutritionFormProps {
  onSubmit: (data: NutritionPreferences) => void;
  initialData?: NutritionPreferences;
}

export const NutritionForm = ({ onSubmit, initialData }: NutritionFormProps) => {
  const [formData, setFormData] = useState<NutritionPreferences>({
    weight: initialData?.weight || 0,
    height: initialData?.height || 0,
    age: initialData?.age || 0,
    gender: initialData?.gender || 'male',
    activityLevel: initialData?.activityLevel || 'moderate',
    goal: initialData?.goal || 'maintain',
    healthCondition: initialData?.healthCondition || null,
    dietaryPreferences: initialData?.dietaryPreferences || [],
    allergies: initialData?.allergies || []
  });

  const handleInputChange = (field: keyof NutritionPreferences, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.weight || !formData.height || !formData.age) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    if (formData.weight < 30 || formData.weight > 300) {
      toast.error("Por favor, insira um peso válido entre 30 e 300 kg");
      return;
    }

    if (formData.height < 100 || formData.height > 250) {
      toast.error("Por favor, insira uma altura válida entre 100 e 250 cm");
      return;
    }

    if (formData.age < 18 || formData.age > 120) {
      toast.error("Por favor, insira uma idade válida entre 18 e 120 anos");
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Informações Básicas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight || ''}
                onChange={(e) => handleInputChange('weight', Number(e.target.value))}
                placeholder="Ex: 70"
                min="30"
                max="300"
              />
            </div>

            <div>
              <Label htmlFor="height">Altura (cm)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height || ''}
                onChange={(e) => handleInputChange('height', Number(e.target.value))}
                placeholder="Ex: 170"
                min="100"
                max="250"
              />
            </div>

            <div>
              <Label htmlFor="age">Idade</Label>
              <Input
                id="age"
                type="number"
                value={formData.age || ''}
                onChange={(e) => handleInputChange('age', Number(e.target.value))}
                placeholder="Ex: 30"
                min="18"
                max="120"
              />
            </div>

            <div>
              <Label htmlFor="gender">Sexo</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: 'male' | 'female') => handleInputChange('gender', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="activityLevel">Nível de Atividade Física</Label>
              <Select
                value={formData.activityLevel}
                onValueChange={(value: NutritionPreferences['activityLevel']) => handleInputChange('activityLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentário</SelectItem>
                  <SelectItem value="light">Leve</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="intense">Intenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Objetivo</h2>
          <GoalCards
            selectedGoal={formData.goal}
            onSelect={(goal: Goal) => handleInputChange('goal', goal)}
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Condição de Saúde (se aplicável)</h2>
          <HealthConditionCards
            selectedCondition={formData.healthCondition}
            onSelect={(condition: HealthCondition) => handleInputChange('healthCondition', condition)}
          />
        </div>
      </Card>

      <Button type="submit" className="w-full bg-green-500 hover:bg-green-600">
        Próxima Etapa
      </Button>
    </form>
  );
};
