
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
  exercise_type: z.enum(['strength', 'cardio', 'mobility']),
  muscle_group: z.enum(['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'full_body']),
  equipment_needed: z.array(z.string()),
  min_sets: z.number().min(1),
  max_sets: z.number().min(1),
  min_reps: z.number().min(1),
  max_reps: z.number().min(1),
  rest_time_seconds: z.number().min(1),
  goals: z.array(z.string())
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
      exercise_type: 'strength',
      muscle_group: 'legs',
      equipment_needed: [],
      min_sets: 3,
      max_sets: 4,
      min_reps: 8,
      max_reps: 12,
      rest_time_seconds: 60,
      goals: []
    }
  });

  const onSubmit = async (data: any) => {
    try {
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
