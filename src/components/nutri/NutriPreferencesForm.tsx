
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectCard } from "@/components/workout/components/SelectCard";
import { NutriPreferences } from "./types";

const formSchema = z.object({
  weight: z.number().min(30).max(300),
  height: z.number().min(100).max(250),
  age: z.number().min(16).max(100),
  gender: z.enum(["male", "female"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "intense"]),
  goal: z.enum(["lose", "maintain", "gain"]),
  healthCondition: z.enum(["hypertension", "diabetes", "depression_anxiety", "none"]).transform(v => v === "none" ? null : v),
  selectedFoods: z.array(z.string()),
  hasAllergies: z.boolean(),
  allergies: z.array(z.string()),
});

interface NutriPreferencesFormProps {
  onSubmit: (data: NutriPreferences) => void;
}

export const NutriPreferencesForm = ({ onSubmit }: NutriPreferencesFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedFoods: [],
      hasAllergies: false,
      allergies: [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                <div className="grid grid-cols-2 gap-4">
                  <SelectCard
                    selected={field.value === "male"}
                    onClick={() => field.onChange("male")}
                  >
                    <span className="text-lg">Masculino</span>
                  </SelectCard>
                  <SelectCard
                    selected={field.value === "female"}
                    onClick={() => field.onChange("female")}
                  >
                    <span className="text-lg">Feminino</span>
                  </SelectCard>
                </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <SelectCard
                  selected={field.value === "sedentary"}
                  onClick={() => field.onChange("sedentary")}
                >
                  <div className="text-center">
                    <span className="text-lg">Sedentário</span>
                    <p className="text-sm text-gray-500">Pouco ou nenhum exercício</p>
                  </div>
                </SelectCard>
                <SelectCard
                  selected={field.value === "light"}
                  onClick={() => field.onChange("light")}
                >
                  <div className="text-center">
                    <span className="text-lg">Leve</span>
                    <p className="text-sm text-gray-500">1-3 dias por semana</p>
                  </div>
                </SelectCard>
                <SelectCard
                  selected={field.value === "moderate"}
                  onClick={() => field.onChange("moderate")}
                >
                  <div className="text-center">
                    <span className="text-lg">Moderado</span>
                    <p className="text-sm text-gray-500">3-5 dias por semana</p>
                  </div>
                </SelectCard>
                <SelectCard
                  selected={field.value === "intense"}
                  onClick={() => field.onChange("intense")}
                >
                  <div className="text-center">
                    <span className="text-lg">Intenso</span>
                    <p className="text-sm text-gray-500">6-7 dias por semana</p>
                  </div>
                </SelectCard>
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SelectCard
                  selected={field.value === "lose"}
                  onClick={() => field.onChange("lose")}
                >
                  <div className="text-center">
                    <span className="text-lg">Perder Peso</span>
                  </div>
                </SelectCard>
                <SelectCard
                  selected={field.value === "maintain"}
                  onClick={() => field.onChange("maintain")}
                >
                  <div className="text-center">
                    <span className="text-lg">Manter Peso</span>
                  </div>
                </SelectCard>
                <SelectCard
                  selected={field.value === "gain"}
                  onClick={() => field.onChange("gain")}
                >
                  <div className="text-center">
                    <span className="text-lg">Ganhar Massa</span>
                  </div>
                </SelectCard>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Gerar Plano Nutricional
        </Button>
      </form>
    </Form>
  );
};
