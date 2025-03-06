
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import type { ProtocolFood } from "@/components/admin/types";

interface FoodFormProps {
  food: ProtocolFood | null;
  foodGroups: { id: number; name: string }[];
  onSubmit: () => void;
  onCancel: () => void;
}

export const FoodForm = ({ food, foodGroups, onSubmit, onCancel }: FoodFormProps) => {
  const [formData, setFormData] = useState<Partial<ProtocolFood>>({
    name: "",
    phase: null,
    food_group_id: null,
    calories: 0,
    protein: null,
    carbs: null,
    fats: null,
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
        (name === 'phase' || name === 'food_group_id' ? parseInt(value) : value)
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

      // Calculate per 100g values if needed
      const updatedData = { ...formData };
      
      if (formData.protein && formData.portion_size && formData.portion_size !== 100) {
        updatedData.protein_per_100g = (formData.protein / formData.portion_size) * 100;
      }
      
      if (formData.carbs && formData.portion_size && formData.portion_size !== 100) {
        updatedData.carbs_per_100g = (formData.carbs / formData.portion_size) * 100;
      }
      
      if (formData.fats && formData.portion_size && formData.portion_size !== 100) {
        updatedData.fats_per_100g = (formData.fats / formData.portion_size) * 100;
      }

      if (food) {
        // Update existing food
        const { error } = await supabase
          .from('protocol_foods')
          .update({
            name: updatedData.name,
            phase: updatedData.phase,
            food_group_id: updatedData.food_group_id,
            calories: updatedData.calories || 0,
            protein: updatedData.protein,
            carbs: updatedData.carbs,
            fats: updatedData.fats,
            portion_size: updatedData.portion_size,
            portion_unit: updatedData.portion_unit,
            pre_workout_compatible: updatedData.pre_workout_compatible,
            post_workout_compatible: updatedData.post_workout_compatible,
            protein_per_100g: updatedData.protein_per_100g,
            carbs_per_100g: updatedData.carbs_per_100g,
            fats_per_100g: updatedData.fats_per_100g
          })
          .eq('id', food.id);

        if (error) throw error;
        toast.success('Alimento atualizado com sucesso');
      } else {
        // Create new food with required fields
        const { error } = await supabase
          .from('protocol_foods')
          .insert({
            name: updatedData.name!,
            calories: updatedData.calories || 0,
            phase: updatedData.phase,
            food_group_id: updatedData.food_group_id,
            protein: updatedData.protein,
            carbs: updatedData.carbs,
            fats: updatedData.fats,
            portion_size: updatedData.portion_size,
            portion_unit: updatedData.portion_unit,
            pre_workout_compatible: updatedData.pre_workout_compatible,
            post_workout_compatible: updatedData.post_workout_compatible,
            protein_per_100g: updatedData.protein_per_100g,
            carbs_per_100g: updatedData.carbs_per_100g,
            fats_per_100g: updatedData.fats_per_100g
          });

        if (error) throw error;
        toast.success('Alimento adicionado com sucesso');
      }

      onSubmit();
    } catch (error: any) {
      console.error('Error saving food:', error);
      toast.error(`Erro ao salvar alimento: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Label htmlFor="phase">Fase</Label>
          <Select
            value={formData.phase?.toString() || ''}
            onValueChange={(value) => handleSelectChange('phase', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sem fase</SelectItem>
              <SelectItem value="1">Fase 1</SelectItem>
              <SelectItem value="2">Fase 2</SelectItem>
              <SelectItem value="3">Fase 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="food_group_id">Grupo de Alimentos</Label>
          <Select
            value={formData.food_group_id?.toString() || ''}
            onValueChange={(value) => handleSelectChange('food_group_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sem grupo</SelectItem>
              {foodGroups.map(group => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <SelectContent>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="unidade">unidade</SelectItem>
                <SelectItem value="colher">colher</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
