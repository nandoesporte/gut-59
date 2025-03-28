
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import type { ProtocolFood } from "@/components/menu/types";
import { FOOD_GROUP_MAP } from "@/components/menu/hooks/useProtocolFoods";

interface FoodFormProps {
  food: ProtocolFood | null;
  foodGroups: { id: number; name: string }[];
  onSubmit: () => void;
  onCancel: () => void;
}

interface FoodDataType {
  name: string;
  calories: number;
  phase_id?: number | null;
  food_group_id: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  fiber: number | null;
  pre_workout_compatible: boolean;
  post_workout_compatible: boolean;
  portion_size: number | null;
  portion_unit: string | null;
  protein_per_100g?: number | null;
  carbs_per_100g?: number | null;
  fats_per_100g?: number | null;
  fiber_per_100g?: number | null;
}

export const FoodForm = ({ food, foodGroups, onSubmit, onCancel }: FoodFormProps) => {
  const [formData, setFormData] = useState<Partial<ProtocolFood>>({
    name: "",
    phase_id: null,
    food_group_id: null,
    calories: 0,
    protein: null,
    carbs: null,
    fats: null,
    fiber: null,
    pre_workout_compatible: true,
    post_workout_compatible: true,
    portion_size: 100,
    portion_unit: "g",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (food) {
      setFormData({
        ...food,
        calories: food.calories || 0,
      });
    }
  }, [food]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? 
        (value === '' ? null : parseFloat(value)) : 
        value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : 
        (name === 'phase_id' || name === 'food_group_id' ? parseInt(value) : value)
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Nome do alimento é obrigatório');
      return;
    }

    if (formData.calories === null || formData.calories === undefined) {
      toast.error('Calorias são obrigatórias');
      return;
    }

    try {
      setIsSubmitting(true);

      const foodData: FoodDataType = {
        name: formData.name,
        calories: Number(formData.calories),
        phase_id: formData.phase_id,
        food_group_id: formData.food_group_id,
        protein: formData.protein,
        carbs: formData.carbs,
        fats: formData.fats,
        fiber: formData.fiber,
        pre_workout_compatible: formData.pre_workout_compatible || false,
        post_workout_compatible: formData.post_workout_compatible || false,
        portion_size: formData.portion_size,
        portion_unit: formData.portion_unit
      };
      
      if (formData.protein !== null && formData.portion_size && formData.portion_size !== 100) {
        foodData.protein_per_100g = (Number(formData.protein) / Number(formData.portion_size)) * 100;
      }
      
      if (formData.carbs !== null && formData.portion_size && formData.portion_size !== 100) {
        foodData.carbs_per_100g = (Number(formData.carbs) / Number(formData.portion_size)) * 100;
      }
      
      if (formData.fats !== null && formData.portion_size && formData.portion_size !== 100) {
        foodData.fats_per_100g = (Number(formData.fats) / Number(formData.portion_size)) * 100;
      }
      
      if (formData.fiber !== null && formData.portion_size && formData.portion_size !== 100) {
        foodData.fiber_per_100g = (Number(formData.fiber) / Number(formData.portion_size)) * 100;
      }

      if (food) {
        const { error } = await supabase
          .from('protocol_foods')
          .update(foodData)
          .eq('id', food.id);

        if (error) throw error;
        toast.success('Alimento atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('protocol_foods')
          .insert(foodData);

        if (error) throw error;
        toast.success('Alimento adicionado com sucesso');
      }

      onSubmit();
    } catch (error) {
      console.error('Error saving food:', error);
      toast.error('Erro ao salvar alimento');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tipos de refeição disponíveis
  const mealTypeOptions = [
    { id: 1, name: "Café da Manhã" },
    { id: 2, name: "Lanche da Manhã" },
    { id: 3, name: "Almoço" },
    { id: 4, name: "Lanche da Tarde" },
    { id: 5, name: "Jantar" }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Alimento *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phase_id">Fase</Label>
          <Select
            value={formData.phase_id?.toString() || ''}
            onValueChange={(value) => handleSelectChange('phase_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Fase 1</SelectItem>
              <SelectItem value="2">Fase 2</SelectItem>
              <SelectItem value="3">Fase 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="food_group_id">Tipo de Refeição *</Label>
          <Select
            value={formData.food_group_id?.toString() || ''}
            onValueChange={(value) => handleSelectChange('food_group_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de refeição" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {mealTypeOptions.map(option => (
                <SelectItem key={option.id} value={option.id.toString()}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Esta informação é crucial e determinará em qual categoria o alimento aparecerá no cardápio do cliente.
            Por favor, selecione corretamente para que o alimento seja exibido na refeição adequada.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="calories">Calorias *</Label>
          <Input
            id="calories"
            name="calories"
            type="number"
            value={formData.calories === null ? '' : formData.calories}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="portion_size">Tamanho da Porção</Label>
          <div className="flex space-x-2">
            <Input
              id="portion_size"
              name="portion_size"
              type="number"
              value={formData.portion_size === null ? '' : formData.portion_size}
              onChange={handleChange}
              className="flex-1"
            />
            <Select
              value={formData.portion_unit || 'g'}
              onValueChange={(value) => handleSelectChange('portion_unit', value)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="unidade">unidade</SelectItem>
                <SelectItem value="colher">colher</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="protein">Proteína (g)</Label>
          <Input
            id="protein"
            name="protein"
            type="number"
            value={formData.protein === null ? '' : formData.protein}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="carbs">Carboidratos (g)</Label>
          <Input
            id="carbs"
            name="carbs"
            type="number"
            value={formData.carbs === null ? '' : formData.carbs}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fats">Gorduras (g)</Label>
          <Input
            id="fats"
            name="fats"
            type="number"
            value={formData.fats === null ? '' : formData.fats}
            onChange={handleChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="fiber">Fibras (g)</Label>
          <Input
            id="fiber"
            name="fiber"
            type="number"
            value={formData.fiber === null ? '' : formData.fiber}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="block mb-2">Compatibilidade</Label>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="pre_workout_compatible" 
              checked={formData.pre_workout_compatible || false}
              onCheckedChange={(checked) => handleCheckboxChange('pre_workout_compatible', checked as boolean)}
            />
            <Label htmlFor="pre_workout_compatible" className="cursor-pointer">Pré-treino</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="post_workout_compatible" 
              checked={formData.post_workout_compatible || false}
              onCheckedChange={(checked) => handleCheckboxChange('post_workout_compatible', checked as boolean)}
            />
            <Label htmlFor="post_workout_compatible" className="cursor-pointer">Pós-treino</Label>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {food ? 'Atualizar Alimento' : 'Adicionar Alimento'}
        </Button>
      </div>
    </form>
  );
};
