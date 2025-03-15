
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const exerciseSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  gif_url: z.string().url('URL inválida').optional(),
  exercise_type: z.enum(['strength', 'cardio', 'mobility']),
  muscle_group: z.enum(['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'full_body']),
  equipment_needed: z.array(z.string()),
  min_sets: z.number().min(1),
  max_sets: z.number().min(1),
  min_reps: z.number().min(1),
  max_reps: z.number().min(1),
  rest_time_seconds: z.number().min(1),
  goals: z.array(z.string()),
  beginner_weight: z.string().optional(),
  moderate_weight: z.string().optional(),
  advanced_weight: z.string().optional()
});

interface ExerciseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  exerciseData?: any;
  editMode?: boolean;
}

export const ExerciseForm = ({ onSuccess, onCancel, exerciseData, editMode = false }: ExerciseFormProps) => {
  const form = useForm({
    resolver: zodResolver(exerciseSchema),
    defaultValues: exerciseData || {
      name: '',
      description: '',
      gif_url: '',
      exercise_type: 'strength',
      muscle_group: 'legs',
      equipment_needed: [],
      min_sets: 3,
      max_sets: 4,
      min_reps: 8,
      max_reps: 12,
      rest_time_seconds: 60,
      goals: [],
      beginner_weight: '',
      moderate_weight: '',
      advanced_weight: ''
    }
  });

  const onSubmit = async (data: any) => {
    try {
      // Ensure exercise_type is one of the allowed values
      const validExerciseType = data.exercise_type === "strength" || 
                                data.exercise_type === "cardio" || 
                                data.exercise_type === "mobility" 
                                ? data.exercise_type 
                                : "mobility";
      
      const safeData = {
        ...data,
        exercise_type: validExerciseType,
        difficulty: data.difficulty || "beginner"
      };
      
      if (editMode && exerciseData?.id) {
        await supabase
          .from('exercises')
          .update(safeData)
          .eq('id', exerciseData.id);
      } else {
        await supabase
          .from('exercises')
          .insert([safeData]);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving exercise:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Exercício</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gif_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do GIF</FormLabel>
              <FormControl>
                <Input {...field} type="url" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="exercise_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Exercício</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Força</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="mobility">Mobilidade</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="muscle_group"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grupo Muscular</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo muscular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legs">Pernas</SelectItem>
                  <SelectItem value="chest">Peito</SelectItem>
                  <SelectItem value="back">Costas</SelectItem>
                  <SelectItem value="shoulders">Ombros</SelectItem>
                  <SelectItem value="arms">Braços</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="full_body">Corpo Completo</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="min_sets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Séries Mínimas</FormLabel>
                <FormControl>
                  <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="max_sets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Séries Máximas</FormLabel>
                <FormControl>
                  <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="min_reps"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repetições Mínimas</FormLabel>
                <FormControl>
                  <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="max_reps"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repetições Máximas</FormLabel>
                <FormControl>
                  <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="rest_time_seconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tempo de Descanso (segundos)</FormLabel>
              <FormControl>
                <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-2 p-4 border rounded-lg">
          <h3 className="font-medium text-lg">Recomendações de Carga</h3>
          <p className="text-sm text-muted-foreground mb-3">Sugestões de carga para diferentes níveis (ex: "10-15kg", "Barra sem peso", "50% do peso corporal")</p>
          
          <FormField
            control={form.control}
            name="beginner_weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nível Iniciante</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: 5-10kg" />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="moderate_weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nível Moderado</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: 15-20kg" />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="advanced_weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nível Avançado</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: 25-30kg" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit">{editMode ? 'Atualizar' : 'Salvar'}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
};
