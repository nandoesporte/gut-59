
import * as React from "react";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { WorkoutPreferences, ExerciseType, ActivityLevel, WorkoutGoal, HealthCondition } from "./types";

const formSchema = z.object({
  weight: z.number().min(30).max(300),
  height: z.number().min(100).max(250),
  age: z.number().min(16).max(100),
  gender: z.enum(["male", "female"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "intense"]),
  goal: z.enum(["lose_weight", "maintain", "gain_mass"]),
  healthConditions: z.array(z.enum(["hypertension", "diabetes", "depression", "anxiety"])).optional(),
  preferredExerciseTypes: z.array(z.enum(["strength", "cardio", "mobility"])),
  availableEquipment: z.array(z.string()),
});

const availableEquipment = [
  "Dumbbells",
  "Barbell",
  "Resistance Bands",
  "Pull-up Bar",
  "Bench",
  "Yoga Mat",
  "None",
];

interface PreferencesFormProps {
  onSubmit: (data: WorkoutPreferences) => void;
}

export const PreferencesForm = ({ onSubmit }: PreferencesFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      healthConditions: [],
      preferredExerciseTypes: [],
      availableEquipment: [],
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values as WorkoutPreferences);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="70"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Altura (cm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="170"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Idade</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="30"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu sexo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="activityLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nível de Atividade Física</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu nível de atividade" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentário</SelectItem>
                  <SelectItem value="light">Leve</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="intense">Intenso</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objetivo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu objetivo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="lose_weight">Perder Peso</SelectItem>
                  <SelectItem value="maintain">Manter Peso</SelectItem>
                  <SelectItem value="gain_mass">Ganhar Massa</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferredExerciseTypes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipos de Exercícios Preferidos</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['strength', 'cardio', 'mobility'] as ExerciseType[]).map((type) => (
                  <label key={type} className="flex items-center space-x-2">
                    <Checkbox
                      checked={field.value?.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange([...field.value, type]);
                        } else {
                          field.onChange(field.value?.filter((t) => t !== type));
                        }
                      }}
                    />
                    <span className="capitalize">{type === 'strength' ? 'Força' : type === 'cardio' ? 'Cardio' : 'Mobilidade'}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="healthConditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condições de Saúde</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['hypertension', 'diabetes', 'depression', 'anxiety'] as HealthCondition[]).map((condition) => 
                  condition && (
                    <label key={condition} className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.value?.includes(condition)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...field.value, condition]);
                          } else {
                            field.onChange(field.value?.filter((c) => c !== condition));
                          }
                        }}
                      />
                      <span className="capitalize">
                        {condition === 'hypertension' ? 'Hipertensão' : 
                         condition === 'diabetes' ? 'Diabetes' : 
                         condition === 'depression' ? 'Depressão' : 
                         'Ansiedade'}
                      </span>
                    </label>
                  )
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="availableEquipment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipamentos Disponíveis</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableEquipment.map((equipment) => (
                  <label key={equipment} className="flex items-center space-x-2">
                    <Checkbox
                      checked={field.value?.includes(equipment)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange([...field.value, equipment]);
                        } else {
                          field.onChange(field.value?.filter((e) => e !== equipment));
                        }
                      }}
                    />
                    <span>{equipment}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Gerar Plano de Treino</Button>
      </form>
    </Form>
  );
};
